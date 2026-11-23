/** Exercise the actual local video image slot through disposable, synthetic video attachments. */
export async function localVideoThumbnailCases(app, controller) {
  const fixture = controller.fixture(app, controller);
  const fs = require("node:fs"), path = require("node:path");
  const names = ["normal.mp4", "full-hd-long-gop.mp4", "high-resolution.mp4", "short.mp4", "rotated.mp4", "alternative.webm", "invalid.mp4"];
  const media = new Map(), rows = [];
  let pulse = null;
  try {
    await fixture.initialize();
    const plugin = fixture.p, service = plugin.localVideoThumbnails;
    fixture.check(service && controller.videoFixtures, "Local video loader and explicit synthetic fixture directory are required");
    const settings = plugin.settings;
    Object.assign(settings, {showAttachments: true, allowRemoteNodeImages: false, generateLocalVideoThumbnails: false});
    await plugin.saveSettings();
    for (const name of names) {
      const bytes = fs.readFileSync(path.join(controller.videoFixtures, name));
      const file = await app.vault.createBinary(fixture.folder + "/" + name, bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
      fixture.files.push(file);
      media.set(name, file);
      plugin.index.insertCreatedFile(file);
    }
    const normal = media.get("normal.mp4");
    const root = await fixture.note("Video root", names.map(name => "[[" + media.get(name).path + "]]").join("\n"));
    const blank = await fixture.note("No video links", "This note has no video attachments.");
    const leaf = await fixture.canvas(normal);
    const node = (host, file) => host.view.contentEl.querySelector(`[data-kplex-path=${JSON.stringify(file.path)}]`);
    const image = (host, file) => node(host, file)?.querySelector('.kplex-local-video-visual img[src^="blob:"]');
    const capture = (host, file) => {
      const owner = node(host, file);
      return [owner.offsetWidth, owner.offsetHeight];
    };
    const navigate = async (host, file) => {
      plugin.notifyNavigation(file.path, host);
      await fixture.until(() => node(host, file)?.isConnected, "Visible native file node " + file.name);
    };
    const loaded = async (host, file) => {
      await fixture.until(() => image(host, file)?.complete && image(host, file).naturalWidth > 0,
        "Decoded visible thumbnail " + file.name, 15000);
      return image(host, file);
    };
    const pixels = image => {
      const canvas = image.ownerDocument.createElement("canvas");
      canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
      const g = canvas.getContext("2d");
      g.drawImage(image, 0, 0);
      const data = g.getImageData(0, 0, canvas.width, canvas.height).data;
      let varied = 0;
      for (let offset = 0; offset < data.length; offset += 4) {
        if (data[offset] !== data[offset + 1] || data[offset + 1] !== data[offset + 2]) varied++;
      }
      const dimensions = [canvas.width, canvas.height];
      canvas.width = 0; canvas.height = 0;
      fixture.check(varied > 0 && Math.max(...dimensions) <= 256, "Actual bounded frame with visible test pattern");
      return {dimensions, varied};
    };
    let gaps = [], last = 0, peakActive = 0, peakQueued = 0;
    const startPulse = () => {
      gaps = []; last = performance.now();
      pulse = window.setInterval(() => {
        const now = performance.now(), stats = service.stats();
        gaps.push(now - last); last = now;
        peakActive = Math.max(peakActive, stats.active);
        peakQueued = Math.max(peakQueued, stats.queued);
      }, 16);
    };
    const stopPulse = () => {
      window.clearInterval(pulse); pulse = null;
      return {samples: gaps.length, maxGapMs: Math.round(Math.max(0, ...gaps))};
    };
    // Observe admissions even when several claims arrive between renderer timer samples.
    const acquire = service.acquire;
    service.acquire = function (...args) {
      const lease = acquire.apply(this, args), stats = this.stats();
      peakActive = Math.max(peakActive, stats.active);
      peakQueued = Math.max(peakQueued, stats.queued);
      return lease;
    };
    fixture.restores.push(() => {service.acquire = acquire;});

    await fixture.ready();
    await fixture.until(() => !plugin.index.hasActiveSourcePreparation() && !plugin.index.hasPendingSourceAuthority(), "Initial video fixture source work settles");
    const settledInventory = app.vault.getFiles().map(file => file.path).sort();
    const workBefore = plugin.startupDiagnostics.snapshot().sessionWork;
    const offGeometry = capture(leaf, normal), offStats = service.stats();
    startPulse();await fixture.wait(300);const settingOff = stopPulse();
    fixture.check(!image(leaf, normal) && service.stats().decodeStarts === offStats.decodeStarts, "Disabled video previews do not start a decoder");

    let binaryReads = 0;
    const readBinary = app.vault.readBinary;
    app.vault.readBinary = function (file) {
      if (media.get(file.name) === file) binaryReads++;
      return readBinary.call(this, file);
    };
    fixture.restores.push(() => {app.vault.readBinary = readBinary;});
    const resourceEntries = performance.now();
    settings.generateLocalVideoThumbnails = true;
    await plugin.saveSettings();
    startPulse();
    for (const name of names) {
      controller.progress = {phase:"Native local video frame", name, rows, stats:service.stats()};
      const file = media.get(name), before = service.stats(), began = performance.now();
      await navigate(leaf, file);
      if (name === "high-resolution.mp4" || name === "invalid.mp4") {
        const rejected = () => name === "high-resolution.mp4"
          ? service.stats().oversized > before.oversized
          : service.stats().decodeStarts > before.decodeStarts;
        await fixture.until(() => rejected() && service.stats().active === 0, "Bounded native video fallback " + name, 12000);
        fixture.check(!image(leaf, file), "Rejected video keeps the ordinary attachment label and icon");
        rows.push({name, outcome:"fallback", elapsedMs:Math.round(performance.now()-began)});
        continue;
      }
      const thumb = await loaded(leaf, file);
      rows.push({name, outcome:"decoded", ...pixels(thumb), elapsedMs:Math.round(performance.now()-began)});
      if (file===normal) fixture.check(JSON.stringify(capture(leaf, normal)) === JSON.stringify(offGeometry), "Thumbnail keeps the existing node geometry");
    }
    const decoderPulse = stopPulse();
    fixture.check(rows.find(row => row.name === "rotated.mp4").dimensions[0] < rows.find(row => row.name === "rotated.mp4").dimensions[1],
      "Native rotation is reflected in the thumbnail aspect ratio");

    const beforeReuse = service.stats();
    await navigate(leaf, normal);await loaded(leaf, normal);
    fixture.check(service.stats().cacheHits > beforeReuse.cacheHits && service.stats().decodeStarts === beforeReuse.decodeStarts,
      "Returning to the same file consumes its session-memory frame");
    const other = await fixture.canvas(normal, "k-plex-react-view", "window");
    const otherImage = await loaded(other, normal);
    fixture.check(otherImage.ownerDocument !== leaf.view.contentEl.ownerDocument, "Popout renders inside a different native document");
    pixels(otherImage);
    other.detach();
    await navigate(leaf, root);
    await fixture.until(() => service.stats().active === 0 && service.stats().queued === 0, "Multiple visible video requests settle");
    fixture.check(peakActive <= 1 && service.stats().retainedBytes <= 8 * 1024 * 1024 && service.stats().cached <= 32,
      "Shared decoder and session cache stay bounded");

    const disabled = () => {
      const stats=service.stats();
      return stats.active === 0 && stats.queued === 0 && stats.cached === 0 && stats.retainedBytes === 0 && stats.liveUrls === 0;
    };
    settings.generateLocalVideoThumbnails = false;await plugin.saveSettings();
    await fixture.until(disabled, "Disable releases all decoder, cache and URL ownership");
    await fixture.until(() => [...media.values()].filter(file => node(leaf, file)).length >= 2,
      "One canvas has multiple video neighbors");
    const beforeBurst = service.stats();
    settings.generateLocalVideoThumbnails = true;
    const enabling = plugin.saveSettings();
    await fixture.until(() => service.stats().decodeStarts > beforeBurst.decodeStarts && peakQueued > 0, "Cold visible video burst uses the shared queue");
    await navigate(leaf, blank);
    await enabling;
    await fixture.until(() => {
      const stats=service.stats();return !stats.active && !stats.queued && !stats.liveUrls;
    }, "Leaving the video neighborhood retires all live consumers");
    const afterDeparture = service.stats().decodeStarts;
    await fixture.wait(250);
    fixture.check(service.stats().decodeStarts === afterDeparture, "Retired neighborhoods do not retry their queued media");
    settings.generateLocalVideoThumbnails = false;await plugin.saveSettings();
    await fixture.until(disabled, "Final disable clears even retained idle video frames");
    fixture.check(!leaf.view.contentEl.querySelector('.kplex-local-video-visual img[src^="blob:"]'), "Disable removes all generated images");
    fixture.check(binaryReads === 0, "Native media loader owns video access");
    fixture.check(!performance.getEntriesByType("resource").some(entry => entry.startTime >= resourceEntries && /^https?:/i.test(entry.name)),
      "Local thumbnail generation starts no remote request");
    fixture.check(JSON.stringify(app.vault.getFiles().map(file => file.path).sort()) === JSON.stringify(settledInventory),
      "Thumbnail generation adds no persisted media files");
    const workAfter = plugin.startupDiagnostics.snapshot().sessionWork;
    for (const key of ["sourceInventoryPasses", "fullBuildStarts", "nodeCatalogStarts", "completeSnapshotSaves", "checkpointSaves"]) {
      fixture.check(workAfter[key] === workBefore[key], "Thumbnail presentation starts no index or snapshot work: " + key);
    }
    return {rows, settingOff, decoderPulse, peakActive, peakQueued, binaryReads, cleared:service.stats()};
  } finally {
    if (pulse !== null) window.clearInterval(pulse);
    await fixture.cleanup();
  }
}
