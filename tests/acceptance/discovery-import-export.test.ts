/**
 * Acceptance tests for Discovery Import/Export feature.
 * @see specs/functional/discovery-import-export.feature
 *
 * FSIDs covered:
 * - FS-ExportDiscovery
 * - FS-ImportDiscovery
 * - FS-ImportInvalidJson
 * - FS-LoadInitialData
 *
 * NOTE: These tests require a browser rendering environment (React components,
 * file download/upload, fetch mocking). They are defined as test.todo()
 * pending E2E tooling setup.
 */

describe('Discovery Import/Export', () => {
  // @fsid:FS-ExportDiscovery
  describe('FS-ExportDiscovery', () => {
    test.todo('clicking Save Discovery downloads a JSON file named after the discovery title');
  });

  // @fsid:FS-ImportDiscovery
  describe('FS-ImportDiscovery', () => {
    test.todo('selecting a valid JSON file via Open Discovery replaces the current discovery with imported data');
  });

  // @fsid:FS-ImportInvalidJson
  describe('FS-ImportInvalidJson', () => {
    test.todo('selecting an invalid JSON file logs an error and leaves the current discovery unchanged');
  });

  // @fsid:FS-LoadInitialData
  describe('FS-LoadInitialData', () => {
    test.todo('on application start, /data.json is fetched and displayed in the discovery grid');
  });
});
