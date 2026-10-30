/**
 * @file markdownImport.js
 * @overview markdown Import implementation extracted from Mindmap Builder.
 * Context accessors retain live per-invocation state; no plugin/view singleton is introduced.
 */

/** Creates this subsystem against the invocation-owned context. */
import { parseBranchClipboard } from "./branchClipboard";
import { createBranchPaste } from "./branchPaste.js";

export function createMarkdownImport(runtimeContext) {
  const {
    pasteBranch,
    cancelBranchPaste,
    disposeBranchPaste,
    isBranchPasteBusy,
    watchPasteMetadata,
  } = createBranchPaste(runtimeContext);
  /**
   * Generates a hierarchy of links based on the headings in the target file.
   */
  const importOutline = async () => {
    if (!runtimeContext.isViewSet()) return;
    const sel = runtimeContext.getMindmapNodeFromSelection();
    if (!sel) {
      new runtimeContext.Notice(runtimeContext.t("NOTICE_SELECT_NODE_CONTAINING_LINK"));
      return;
    }
    const allElements = runtimeContext.ea.getViewElements();
    const nodeText = runtimeContext.getTextFromNode(allElements, sel, true, false); // Get raw text
    const markdownFile = runtimeContext.getNodeMarkdownFile(nodeText);
    if (!markdownFile) {
      new runtimeContext.Notice(runtimeContext.t("NOTICE_NO_LINKED_FILE"));
      return;
    }
    const cache = await app.metadataCache.blockCache.getForFile(
      {
        isCancelled: () => false,
      },
      markdownFile,
    );
    if (!cache || !cache.blocks) {
      new runtimeContext.Notice(runtimeContext.t("NOTICE_NO_HEADINGS"));
      return;
    }
    const shortFilePath = app.metadataCache.fileToLinktext(
      markdownFile,
      runtimeContext.ea.targetView.file.path,
      true,
    );
    const outlines = [];
    for (const block of cache.blocks) {
      if (block.node.type === "heading") {
        const depth = block.node.depth;
        // Strip markdown heading markers (# ) from display text
        const rawHeadingText = block.display.replace(/^#+\s+/, "");
        if (rawHeadingText === "Excalidraw Data") break;
        // Format Alias: Replace pipe with space to prevent broken links
        const alias = rawHeadingText.replace(/\|/g, " ");
        // Format Anchor: replace specific chars (#|\:) with space for the link target
        const anchor = rawHeadingText.replace(/[|#\\:]/g, " ");
        const indent = "  ".repeat(Math.max(0, depth - 1));
        outlines.push(`${indent}- [[${shortFilePath}#${anchor}|${alias}]]`);
      }
    }
    if (outlines.length === 0) {
      new runtimeContext.Notice(runtimeContext.t("NOTICE_NO_HEADINGS"));
      return;
    }
    await importTextToMap(outlines.join("\n"));
  };

  /**
// Core logic to parse a list string and add nodes to the map.
// Now dynamically links "## Submap" definitions to their "![[#Submap]]" embed nodes.
**/
  const importTextToMap = async (rawText) => {
    if (!runtimeContext.isViewSet()) return;
    if (!rawText) return;
    let sel = runtimeContext.getMindmapNodeFromSelection();
    let currentParent;
    // Filter out empty lines AND divider lines
    const lines = rawText.split(/\r\n|\n|\r/).filter((l) => {
      const trimmed = l.trim();
      return trimmed !== "" && !/^-{3,}$/.test(trimmed);
    });
    if (lines.length === 0) return;
    // Regex patterns
    const boundaryRegex = /\s#boundary\b/;
    const blockRefRegex = /\s\^([a-zA-Z0-9]{8})$/;
    const crossLinkRegex = /(?:\(([^):]+)::\s*)?\[\[#\^([a-zA-Z0-9]{8})\|\*\]\](?:\))?/g;
    const ontologyRegex = /^(.+?)::\s*(.*)$/;
    const submapRefRegex = /^!\[\[#([^\]]+)\]\]$/; // Matches ![[#Submap Name]]
    if (lines.length === 1) {
      let text = lines[0];
      const listMatch = text.match(/^(\s*)(?:-|\*|\d+\.)\s+(.*)$/);
      if (listMatch) {
        text = listMatch[2].trim();
        if (/^\[[ xX]\] /.test(text)) {
          // Retain task syntax if it was an imported list item
          text = "- " + text;
        }
      } else {
        text = text.trim();
      }
      text = text.replace(boundaryRegex, "");
      text = text.replace(blockRefRegex, "");
      const ontologyMatch = text.match(ontologyRegex);
      let ontology = null;
      if (ontologyMatch) {
        ontology = ontologyMatch[1].trim();
        text = ontologyMatch[2].trim();
      }
      let isSubmapRef = false;
      const submapRefMatch = text.match(submapRefRegex);
      if (submapRefMatch) {
        isSubmapRef = true;
        text = submapRefMatch[1].trim();
      }
      if (text) {
        currentParent = await runtimeContext.addNode(
          text.trim(),
          true,
          false,
          null,
          null,
          null,
          ontology,
        );
        if (isSubmapRef) {
          runtimeContext.ea.addAppendUpdateCustomData(currentParent.id, {
            isAdditionalRoot: true,
          });
        }
        if (sel) {
          runtimeContext.selectNodeInView(sel);
        }
        return;
      }
    }
    let parsed = [];
    let rootTextFromHeader = null;
    const isHeader = (l) => l.match(/^#+\s/);
    const isListItem = (l) => l.match(/^(\s*)(?:-|\*|\d+\.)\s+(.*)$/);
    if (!isHeader(lines[0]) && !isListItem(lines[0])) {
      new runtimeContext.Notice(runtimeContext.t("NOTICE_PASTE_ABORTED"));
      return;
    }
    const delta = isHeader(lines[0]) ? 1 : 0;
    const notice = new runtimeContext.Notice(runtimeContext.t("NOTICE_PASTE_START"), 0);
    await sleep(10);
    // Maps for crosslink & submap reconstruction
    const blockRefToNodeId = new Map(); // ^12345678 -> newNodeId
    const nodeToOutgoingRefs = new Map(); // newNodeId -> [{ref: string, label: string}, ...]
    lines.forEach((line, index) => {
      let text = "";
      let indent = 0;
      let isSubmapDef = false;
      if (isHeader(line)) {
        if (index === 0) {
          indent = 0;
          text = line.replace(/^#+\s/, "").trim();
        } else {
          // Subsequent headers signify details of a Submap
          isSubmapDef = true;
          text = line.replace(/^#+\s/, "").trim();
          indent = -1; // Special indent pushes it strictly below its parent in stack validation
        }
      } else {
        const match = isListItem(line);
        if (match) {
          indent = delta + match[1].length;
          let extractedText = match[2].trim();
          // Check if list item has task bracket syntax
          if (/^\[[ xX]\] /.test(extractedText)) {
            extractedText = "- " + extractedText;
          }
          text = extractedText;
        } else if (parsed.length > 0) {
          // multiline handling
          parsed[parsed.length - 1].text += "\n" + line.trim();
          return;
        }
      }
      if (text || isSubmapDef) {
        const hasBoundary = boundaryRegex.test(text);
        text = text.replace(boundaryRegex, "");
        const refMatch = text.match(blockRefRegex);
        let blockRef = null;
        if (refMatch) {
          blockRef = refMatch[1];
          text = text.replace(blockRefRegex, "");
        }
        const outgoingRefs = [];
        crossLinkRegex.lastIndex = 0;
        text = text.replace(crossLinkRegex, (_match, label, ref) => {
          outgoingRefs.push({
            ref: ref,
            label: label ? label.trim() : null,
          });
          return "";
        });
        const ontologyMatch = text.match(ontologyRegex);
        let ontology = null;
        if (ontologyMatch) {
          ontology = ontologyMatch[1].trim();
          text = ontologyMatch[2].trim();
        }
        let isSubmapRef = false;
        text = text.trim();
        const submapRefMatch = text.match(submapRefRegex);
        if (submapRefMatch) {
          isSubmapRef = true;
          text = submapRefMatch[1].trim();
        }
        parsed.push({
          indent,
          text,
          hasBoundary,
          blockRef,
          outgoingRefs,
          ontology,
          isSubmapDef,
          isSubmapRef,
        });
      }
    });
    if (parsed.length === 0 && !rootTextFromHeader) {
      new runtimeContext.Notice(runtimeContext.t("NOTICE_NO_LIST"));
      return;
    }
    runtimeContext.ea.clear();
    const rootSelected = !!sel;
    const createdBoundaries = [];
    const createImportBoundary = (nodeId) => {
      const node = runtimeContext.ea.getElement(nodeId);
      if (!node) return;
      const id = runtimeContext.ea.generateElementId();
      const st = runtimeContext.getAppState();
      const boundaryEl = {
        id: id,
        type: "line",
        x: node.x,
        y: node.y,
        width: 1,
        height: 1,
        angle: 0,
        roughness: st.currentItemRoughness,
        strokeColor: node.strokeColor,
        backgroundColor: node.strokeColor,
        fillStyle: "solid",
        strokeWidth: 2,
        strokeStyle: "solid",
        opacity: 30,
        points: [
          [0, 0],
          [1, 1],
          [0, 0],
        ],
        polygon: true,
        locked: false,
        groupIds: node.groupIds || [],
        customData: {
          isBoundary: true,
        },
        roundness:
          runtimeContext.arrowType === "curved"
            ? {
                type: 2,
              }
            : null,
      };
      runtimeContext.ea.elementsDict[id] = boundaryEl;
      runtimeContext.ea.addAppendUpdateCustomData(nodeId, {
        boundaryId: id,
      });
      createdBoundaries.push({
        nodeId,
        boundaryId: id,
      });
    };
    const submapNodesByName = new Map();
    if (!sel) {
      // Filter out submap definitions (-1 indent) to accurately find the true top-level items
      const nonSubmapItems = parsed.filter((p) => !p.isSubmapDef);
      const minIndent = Math.min(...nonSubmapItems.map((p) => p.indent));
      const topLevelItems = nonSubmapItems.filter((p) => p.indent === minIndent);
      const processRootMeta = (item, id) => {
        if (item.blockRef) blockRefToNodeId.set(item.blockRef, id);
        if (item.outgoingRefs.length > 0) nodeToOutgoingRefs.set(id, item.outgoingRefs);
        if (item.hasBoundary) createImportBoundary(id);
        if (item.isSubmapRef) {
          runtimeContext.ea.addAppendUpdateCustomData(id, {
            isAdditionalRoot: true,
          });
          submapNodesByName.set(item.text, runtimeContext.ea.getElement(id));
        }
      };
      // If there is exactly one top-level item, it becomes the new master root
      if (topLevelItems.length === 1) {
        const rootItem = topLevelItems[0];
        const rootIndex = parsed.indexOf(rootItem);
        sel = currentParent = await runtimeContext.addNode(
          rootItem.text,
          true,
          true,
          [],
          null,
          null,
          rootItem.ontology,
        );
        processRootMeta(rootItem, currentParent.id);
        // Safely extract the root item from the array so it isn't rendered twice
        if (rootIndex !== -1) {
          parsed.splice(rootIndex, 1);
        }
      } else {
        sel = currentParent = await runtimeContext.addNode(
          runtimeContext.t("INPUT_TITLE_PASTE_ROOT"),
          true,
          true,
          [],
          null,
        );
      }
    } else {
      currentParent = sel;
      runtimeContext.ea.copyViewElementsToEAforEditing([sel]);
      currentParent = runtimeContext.ea.getElement(sel.id);
    }
    const stack = [
      {
        indent: -1,
        node: currentParent,
      },
    ];
    if (rootSelected) {
      const allViewElements = runtimeContext.ea.getViewElements();
      const info = runtimeContext.getHierarchy(sel, allViewElements);
      const projectElements = runtimeContext.getMindmapProjectElements(
        info.rootId,
        allViewElements,
      );
      runtimeContext.ea.copyViewElementsToEAforEditing(
        projectElements.filter((el) => !runtimeContext.ea.getElement(el.id)),
      );
    }
    for (const item of parsed) {
      // Relocate stack parser root when encountering a ## Submap Header
      if (item.isSubmapDef) {
        const targetNode = submapNodesByName.get(item.text);
        if (targetNode) {
          stack.length = 0;
          stack.push({
            indent: -1,
            node: targetNode,
          });
        } else {
          // Edge case: Submap def without embed. Create at root to salvage data.
          const currentAllElements = runtimeContext.ea.getElements();
          const newNode = await runtimeContext.addNode(
            item.text,
            false,
            true,
            currentAllElements,
            currentParent,
            null,
            null,
          );
          runtimeContext.ea.addAppendUpdateCustomData(newNode.id, {
            isAdditionalRoot: true,
          });
          submapNodesByName.set(item.text, newNode);
          stack.length = 0;
          stack.push({
            indent: -1,
            node: newNode,
          });
        }
        continue;
      }
      while (stack.length > 1 && item.indent <= stack[stack.length - 1].indent) {
        stack.pop();
      }
      const parentNode = stack[stack.length - 1].node;
      const currentAllElements = runtimeContext.ea.getElements();
      const newNode = await runtimeContext.addNode(
        item.text,
        false,
        true,
        currentAllElements,
        parentNode,
        null,
        item.ontology,
      );
      // Process Metadata
      if (item.blockRef) blockRefToNodeId.set(item.blockRef, newNode.id);
      if (item.outgoingRefs.length > 0) nodeToOutgoingRefs.set(newNode.id, item.outgoingRefs);
      if (item.hasBoundary) createImportBoundary(newNode.id);
      if (item.isSubmapRef) {
        runtimeContext.ea.addAppendUpdateCustomData(newNode.id, {
          isAdditionalRoot: true,
        });
        submapNodesByName.set(item.text, newNode);
      }
      stack.push({
        indent: item.indent,
        node: newNode,
      });
    }
    // -------------------------------------------------------------------------
    //  Generate Crosslinks
    // -------------------------------------------------------------------------
    nodeToOutgoingRefs.forEach((targetRefs, sourceId) => {
      targetRefs.forEach((targetObj) => {
        const { ref, label } = targetObj;
        const targetId = blockRefToNodeId.get(ref);
        if (targetId) {
          const arrowId = runtimeContext.ea.connectObjects(sourceId, null, targetId, null, {
            startArrowHead: null,
            endArrowHead: "triangle",
          });
          const arrowEl = runtimeContext.ea.getElement(arrowId);
          if (arrowEl) {
            arrowEl.strokeStyle = "dashed";
            runtimeContext.addUpdateArrowLabel(arrowEl, label);
          }
        }
      });
    });
    // -------------------------------------------------------------------------
    // "Right-Left" Balanced Layout Adjustment for Imported L1 Nodes
    // -------------------------------------------------------------------------
    const rootIdForImport = sel
      ? runtimeContext.getHierarchy(sel, runtimeContext.ea.getElements()).rootId
      : currentParent.id;
    const rootElForImport = sel ? runtimeContext.ea.getElement(rootIdForImport) : currentParent;
    if (rootElForImport) {
      const mode = rootElForImport.customData?.growthMode || runtimeContext.currentModalGrowthMode;
      if (mode === "Right-Left" && currentParent.id === rootIdForImport) {
        const eaElements = runtimeContext.ea.getElements();
        const importedL1Nodes = eaElements.filter(
          (el) =>
            el.customData?.mindmapNew &&
            eaElements.some(
              (arrow) =>
                arrow.type === "arrow" &&
                arrow.customData?.isBranch &&
                arrow.startBinding?.elementId === currentParent.id &&
                arrow.endBinding?.elementId === el.id,
            ),
        );
        importedL1Nodes.sort(
          (a, b) => (a.customData?.mindmapOrder || 0) - (b.customData?.mindmapOrder || 0),
        );
        if (importedL1Nodes.length > 0) {
          const splitIndex = Math.ceil(importedL1Nodes.length / 2);
          importedL1Nodes.forEach((node, i) => {
            runtimeContext.ea.addAppendUpdateCustomData(node.id, {
              mindmapNew: undefined,
            });
            if (i < splitIndex) {
              node.x = rootElForImport.x + rootElForImport.width + 100;
            } else {
              node.x = rootElForImport.x - node.width - 100;
            }
          });
        }
      }
    }
    await runtimeContext.addElementsToView({
      repositionToCursor: !rootSelected,
      captureUpdate: "EVENTUALLY",
    });
    // -------------------------------------------------------------------------
    //  Fix Z-Index for Created Boundaries (Parents Below Children)
    // -------------------------------------------------------------------------
    if (createdBoundaries.length > 0) {
      const allEls = runtimeContext.ea.getViewElements();
      const boundariesWithDepth = createdBoundaries.map((b) => {
        const node = allEls.find((e) => e.id === b.nodeId);
        const depth = node ? runtimeContext.getHierarchy(node, allEls).depth : 0;
        return {
          ...b,
          depth,
        };
      });
      boundariesWithDepth.sort((a, b) => a.depth - b.depth);
      for (const b of boundariesWithDepth) {
        const currentEls = runtimeContext.ea.getViewElements();
        let parentBoundaryIndex = -1;
        let curr = currentEls.find((e) => e.id === b.nodeId);
        while (curr) {
          const parent = runtimeContext.getParentNode(curr.id, currentEls);
          if (!parent) break;
          if (parent.customData?.boundaryId) {
            const pIndex = currentEls.findIndex((el) => el.id === parent.customData.boundaryId);
            if (pIndex !== -1) {
              parentBoundaryIndex = pIndex;
              break;
            }
          }
          curr = parent;
        }
        const targetIndex = parentBoundaryIndex !== -1 ? parentBoundaryIndex + 1 : 0;
        runtimeContext.ea.moveViewElementToZIndex(b.boundaryId, targetIndex);
      }
    }
    const allInView = runtimeContext.ea.getViewElements();
    const targetToSelect = sel
      ? allInView.find((e) => e.id === sel.id)
      : allInView.find((e) => e.id === currentParent?.id);
    if (targetToSelect) {
      runtimeContext.selectNodeInView(targetToSelect);
    }
    const rootId = sel ? runtimeContext.getHierarchy(sel, allInView).rootId : currentParent.id;
    await runtimeContext.triggerGlobalLayout(rootId);
    notice.setMessage(runtimeContext.t("NOTICE_PASTE_COMPLETE"));
    notice.setAutoHide(4000);
  };

  /**
// Pastes a Markdown list from clipboard into the map, converting it to nodes.
**/
  const pasteListToMap = async (contentToPaste = null) => {
    const rawText = contentToPaste || (await navigator.clipboard.readText());
    if (!rawText) {
      new runtimeContext.Notice(runtimeContext.t("NOTICE_CLIPBOARD_EMPTY"));
      return;
    }
    await importTextToMap(rawText);
  };

  /**
   * Intelligent paste dispatcher. Parses clipboard for Element JSON / Raw Images,
   * translates them to Markdown strings, and passes them to `addNode()`.
   */
  const pasteElementToMap = async () => {
    if (!runtimeContext.isViewSet()) return;
    if (isBranchPasteBusy()) return;
    const sel = runtimeContext.getMindmapNodeFromSelection();
    let rawText = "";
    try {
      rawText = await navigator.clipboard.readText();
    } catch (e) {}
    const clipboardPayload = parseBranchClipboard(rawText);
    if (clipboardPayload && (await pasteBranch(clipboardPayload, sel))) return;
    // Standard text-list paste handles root-level initialization better.
    if (!sel) {
      await pasteListToMap(rawText);
      return;
    }
    const excalidrawClipboardPayload = !!clipboardPayload;
    // Scenario 1: Excalidraw Element JSON (Single Element or Container+Text)
    if (excalidrawClipboardPayload) {
      const clipboardData = clipboardPayload;
      if (clipboardData && clipboardData.elements) {
        const els = clipboardData.elements.filter((e) => !e.isDeleted);
        const isSingleElement = els.length === 1 && ["embeddable", "text"].includes(els[0].type);
        const textEl = els.find((e) => e.type === "text");
        const containerEl = els.find((e) => ["rectangle", "ellipse", "diamond"].includes(e.type));
        const isContainerText =
          els.length === 2 && textEl && containerEl && textEl.containerId === containerEl.id;
        const isSingleImageJSON = els.length === 1 && els[0].type === "image";
        if (isSingleImageJSON) {
          const fileId = els[0].fileId;
          const imagePathResolved = runtimeContext.ea.getPathForImageFileId(fileId);
          if (imagePathResolved) {
            if (app.vault.getFileByPath(imagePathResolved)) {
              await pasteListToMap(`![[${imagePathResolved}]]`);
            } else {
              await pasteListToMap(`![pasted image](${imagePathResolved})`);
            }
            return;
          }
        } else if (isSingleElement || isContainerText) {
          let textToPaste = "";
          let shapeToPaste = null;
          if (isContainerText) {
            textToPaste = textEl.rawText;
            shapeToPaste = containerEl.type;
          } else if (els[0].type === "text") {
            textToPaste = els[0].rawText;
          } else if (els[0].type === "embeddable") {
            const link = els[0].link;
            if (link.match(/^https?:\/\//i)) {
              textToPaste = `![](${link})`;
            } else {
              textToPaste = link.startsWith("[[") ? `!${link}` : `![[${link}]]`;
            }
            if (textToPaste) {
              pasteListToMap(textToPaste);
              return;
            }
          }
          if (textToPaste) {
            // Add as a normal node using central logic
            const newNode = await runtimeContext.addNode(
              textToPaste,
              false,
              false,
              null,
              null,
              null,
              null,
            );
            // Copy link from clipboard text element if present to preserve references
            if (newNode && textEl && textEl.link) {
              const freshNode = runtimeContext.ea
                .getViewElements()
                .find((el) => el.id === newNode.id);
              if (freshNode) {
                runtimeContext.ea.copyViewElementsToEAforEditing([freshNode]);
                runtimeContext.ea.getElement(freshNode.id).link = textEl.link;
                await runtimeContext.addElementsToView({
                  captureUpdate: "EVENTUALLY",
                });
              }
            }
            // Recreate the shape if it was inside a container
            if (shapeToPaste) {
              const isContainer = ["rectangle", "ellipse", "diamond"].includes(newNode.type);
              if (isContainer) {
                if (newNode.type !== shapeToPaste) {
                  runtimeContext.selectNodeInView(newNode);
                  await runtimeContext.toggleBox(); // Removes auto-added box of the wrong shape
                  await runtimeContext.toggleBox(shapeToPaste); // Re-adds correct shape box
                }
              } else {
                runtimeContext.selectNodeInView(newNode);
                await runtimeContext.toggleBox(shapeToPaste);
              }
            }
            return;
          }
        }
      }
    }
    // Scenario 2: Native image payload intercepted from system clipboard (Blobs)
    let hasImageBlob = false;
    let blob = null;
    let mimeType = null;
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find((t) => t.startsWith("image/"));
        if (imageType) {
          hasImageBlob = true;
          mimeType = imageType;
          blob = await item.getType(imageType);
          break;
        }
      }
    } catch (e) {}
    if (hasImageBlob) {
      const beforeIds = new Set(runtimeContext.ea.getViewElements().map((e) => e.id));
      // Trigger native paste via synthetic event so Excalidraw saves the file natively
      const dt = new DataTransfer();
      if (hasImageBlob && blob) {
        const file = new File([blob], `Pasted image.${mimeType.split("/")[1] || "png"}`, {
          type: mimeType,
        });
        dt.items.add(file);
      }
      const pasteEvent = new ClipboardEvent("paste", {
        clipboardData: dt,
        bubbles: true,
        cancelable: true,
      });
      const targetEl =
        runtimeContext.ea.targetView.contentEl.querySelector(".excalidraw") ||
        runtimeContext.ea.targetView.contentEl;
      const originallySelectedElement = runtimeContext.ea.getViewSelectedElement();
      targetEl.dispatchEvent(pasteEvent);
      let newImageEl = null;
      // Poll to wait for Excalidraw to assign a fileId to the new image
      for (let i = 0; i < 40; i++) {
        await sleep(50);
        const currentElements = runtimeContext.ea.getViewElements();
        const added = currentElements.filter((e) => !beforeIds.has(e.id) && e.type === "image");
        if (added.length > 0) {
          const tmpNewImageEl = added[added.length - 1];
          if (!tmpNewImageEl.fileId) continue;
          // Verify the image file path is resolved in the EA cache
          const path = runtimeContext.ea.getPathForImageFileId(tmpNewImageEl.fileId);
          if (!path) continue;
          newImageEl = tmpNewImageEl;
          break;
        }
      }
      if (newImageEl) {
        // Silently delete the temporary pasted image
        await sleep(200); // contingency to ensure Excalidraw has finished processing the new image
        const imageID = newImageEl.id;
        const imagePathResolved = runtimeContext.ea.getPathForImageFileId(newImageEl.fileId);
        runtimeContext.ea.clear();
        runtimeContext.ea.copyViewElementsToEAforEditing([newImageEl]);
        runtimeContext.ea.getElement(imageID).isDeleted = true;
        await runtimeContext.addElementsToView({
          captureUpdate: "EVENTUALLY",
          shouldRestoreElements: false,
        });
        if (originallySelectedElement) {
          runtimeContext.ea.selectElementsInView([originallySelectedElement.id]); // Reselect original node because paste image steals selection
        }
        if (imagePathResolved) {
          await pasteListToMap(`![pasted image](${imagePathResolved})`);
        }
      }
      return;
    }
    // Fallback to Outline parser
    if (!excalidrawClipboardPayload) {
      await pasteListToMap();
    } else {
      new runtimeContext.Notice(runtimeContext.t("NOTICE_PASTE_ABORTED"));
    }
  };
  return {
    importOutline,
    importTextToMap,
    pasteListToMap,
    pasteElementToMap,
    cancelBranchPaste,
    disposeBranchPaste,
    isBranchPasteBusy,
    watchPasteMetadata,
  };
}
