# Startup indexing

K-Plex registers its native view types first, then starts loading saved settings
and initializing services in one deferred task after native CSS loading and
workspace readiness. This also keeps service work out of the native CSS wait when
reloading into an already-ready workspace.
A restored Plex keeps its native tab and
serialized state while showing a loading message; it mounts with your saved
preferences when those services are available. Opening a Plex during this wait
joins the same initialization. Failure or plugin unload settles pending requests
without mounting a canvas with default settings.

This separates Obsidian's plugin `onload` duration from settings/service readiness
and index readiness. Startup measurements must include the later work too. The
index strategy, cache validation and preparation switches below retain their
existing meaning.

Native CSS completion uses a guarded, temporary instance hook that is restored
after its first call or plugin retirement. A host without that observable hook
falls back to workspace readiness plus the same deferred task; initialization
still works, but separation from that host's unobserved CSS load clock is not
guaranteed. CSS failure settles pending service requests without adding a second
host error notice.

In **Settings → K-Plex → Indexing config → Prepare index before opening K-Plex**, choose whether
K-Plex prepares its index when Obsidian starts, or waits until you open a Plex.
Desktop, tablet and phone have separate switches. Desktop starts enabled; tablet and phone
start disabled. These defaults also apply when upgrading settings that lack the switches.
Your saved choices are preserved.

Turning preparation off defers saved index loading, the vault-wide search catalog and background
indexing until a Plex opens. The first opening may take longer. A Plex restored in your workspace
counts as open, including an inactive tab or sidebar. An explicit index rebuild also starts work.
History and pins alone do not start preparation.

Changes apply after restarting Obsidian or reloading the plugin. Resizing a tab, opening a popout
or changing a switch does not change the running session's startup policy. After first opening,
closing and reopening a Plex reuses that session's index and normal cancellation/resume behavior.

**Indexing strategy** also has separate Desktop, Tablet and Phone choices. Eager prepares the
complete index in the background; On demand prepares the notes needed for your Plex. The defaults
are Eager on desktop and On demand on tablet and phone. Combined with the startup switches,
desktop prepares at Obsidian startup while tablet and phone wait for a Plex to open.

These defaults apply to fresh installations and missing device fields on upgrade. The previous
single global strategy is retained as compatibility data but does not override the new device
defaults. Explicit saved device choices always win. Both the strategy and startup switches apply
after restarting Obsidian or reloading the plugin. Web links keep their existing
background discovery. Startup switches do not change relationship meaning or saved appearances.
