## K-Plex support report

```json
{
  "formatVersion": 1,
  "capturedAt": "2026-10-10T13:00:01.000Z",
  "index": {
    "availability": "available",
    "decisionsOmitted": 0,
    "formatVersion": 1,
    "generatedAt": "2026-10-10T11:00:00.000Z",
    "plugin": {
      "id": "k-plex",
      "version": "0.1.0"
    },
    "platform": "desktop",
    "device": {
      "obsidianApiVersion": "unavailable",
      "operatingSystem": "unavailable",
      "formFactor": "unavailable"
    },
    "status": {
      "upToDate": false,
      "phase": "indexing",
      "indexedFiles": 4,
      "totalFiles": 73
    },
    "graph": {
      "nodes": 152,
      "publishedMarkdownFiles": 4,
      "authoritative": false
    },
    "hydration": {
      "run": null,
      "pages": null,
      "relations": null,
      "evidence": null,
      "phase": "unavailable",
      "lastActivePhase": "unavailable",
      "startedAt": null,
      "phaseStartedAt": null,
      "lastProgressAt": null,
      "outcome": "unavailable"
    },
    "saved": {
      "storage": "unavailable",
      "invalidActive": null,
      "active": null,
      "checkpoint": null
    },
    "sources": {
      "formatVersion": null,
      "databaseVersion": null,
      "factFormatVersion": null,
      "factCompilerVersion": null,
      "bodyParserVersion": null,
      "resolutionVersion": null,
      "activated": null,
      "unsaved": null,
      "empty": null,
      "chunksWritten": null,
      "bytesWritten": null,
      "familiesReused": null,
      "readFailures": null,
      "sequenceMin": null,
      "sequenceMax": null,
      "peakDecodeBytes": null,
      "storage": "unavailable",
      "lastReason": "unavailable",
      "familyFailures": {
        "values": null,
        "body-urls": null,
        "metadata": null,
        "resolution": null
      }
    },
    "decisions": [
      {
        "at": 350,
        "stage": "restore",
        "reason": "unrecognized",
        "added": null,
        "removed": null,
        "modified": null,
        "completedMarkdownFiles": null,
        "durationMs": null,
        "changedKeys": []
      }
    ]
  },
  "environment": {
    "pluginVersion": "0.1.0",
    "obsidianApiVersion": "1.14.4",
    "operatingSystem": "macos",
    "formFactor": "desktop",
    "locale": "en",
    "theme": "dark",
    "surfaceKind": "tab",
    "hostVersion": "unavailable",
    "installerVersion": "unavailable",
    "enabledPluginCount": 3,
    "activePluginsAvailability": "available",
    "activePluginTotalCount": 3,
    "activePlugins": [
      {
        "kind": "core",
        "id": "graph",
        "name": "Graph view",
        "version": null
      },
      {
        "kind": "community",
        "id": "k-plex",
        "name": "K-Plex",
        "version": "0.1.0"
      },
      {
        "kind": "community",
        "id": "example",
        "name": "Example \u65e5\u672c\u8a9e plugin",
        "version": "1.2.3"
      }
    ],
    "activePluginsOmitted": 0,
    "customThemeAvailability": "available",
    "customThemeName": "Example \u65e5\u672c\u8a9e theme",
    "cssSnippetsAvailability": "available",
    "enabledCssSnippetCount": 1,
    "availableCssSnippetCount": 3
  },
  "indexingPreferences": {
    "indexingMode": "on-demand",
    "urlIndexingMode": "background",
    "indexingThrottle": "responsive",
    "excalidrawFitOnNodeOpen": true
  },
  "startup": {
    "availability": "available",
    "detailedTelemetry": "disabled",
    "frozen": null,
    "progress": {
      "source": null,
      "hydration": null
    },
    "milestones": {},
    "phases": [],
    "overlaps": [],
    "phasesOmitted": 0,
    "overlapsOmitted": 0,
    "source": {
      "checked": 73,
      "reusedBodies": 69,
      "legacyBodies": null,
      "vaultReads": 4,
      "parses": 4,
      "repaired": null,
      "resolutionRefreshes": null,
      "pendingMetadata": null,
      "failures": 0
    },
    "semantic": {
      "policyRevision": null,
      "requested": 1,
      "prepared": null,
      "published": null,
      "cancelled": null,
      "pending": 1,
      "dependencyVisits": null,
      "fullBuilds": null,
      "lastReason": "pending-metadata"
    }
  },
  "eventsCaptureStatus": "active",
  "rawConsoleCaptureStatus": "unsupported",
  "events": [
    {
      "code": "plugin-start",
      "atMs": 0
    },
    {
      "code": "index-phase-change",
      "atMs": 350,
      "phase": "indexing"
    }
  ],
  "eventsSummary": {
    "droppedEvents": 0,
    "retainedBytes": 109
  },
  "truncation": {
    "oldestEventsOmitted": 0,
    "oldestStartupPhasesOmitted": 0,
    "oldestStartupOverlapsOmitted": 0,
    "oldestIndexDecisionsOmitted": 0,
    "activePluginsOmitted": 0
  },
  "limits": {
    "outputBytes": 32768,
    "sessionEvents": 96,
    "activePlugins": 512
  }
}
```
