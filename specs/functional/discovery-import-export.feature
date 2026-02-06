Feature: Discovery Import/Export
  As an Analyst
  I want to export a discovery to a JSON file and import it back later
  So that I can persist my work locally and share it with others

  Non-goals:
  - Export to formats other than JSON (PDF, CSV, etc.)
  - Server-side persistence of exported files
  - Merge or diff between imported and current discovery data
  - Partial import (importing replaces the entire discovery)

  @fsid:FS-ExportDiscovery
  Scenario: Export the current discovery to a JSON file
    Given the Analyst is viewing a discovery with title "My Analysis"
    When the Analyst clicks "Save Discovery" in the toolbar
    Then a JSON file is downloaded with the filename "My_Analysis_export.json"
    And the file contains the complete discovery data (title, goal, date, and all entity collections)

  @fsid:FS-ImportDiscovery
  Scenario: Import a discovery from a JSON file
    Given the Analyst is viewing the discovery grid
    When the Analyst clicks "Open Discovery" in the toolbar
    And selects a valid JSON file containing discovery data
    Then the current discovery is replaced with the data from the file
    And the discovery grid displays the imported entities and relationships

  @fsid:FS-ImportInvalidJson
  Scenario: Import an invalid JSON file
    Given the Analyst is viewing the discovery grid
    When the Analyst clicks "Open Discovery" in the toolbar
    And selects a file that is not valid JSON
    Then the import fails silently (error logged to console)
    And the current discovery data is unchanged

  @fsid:FS-LoadInitialData
  Scenario: Load initial discovery data on application start
    Given the Analyst opens the application
    Then the application fetches "/data.json"
    And the discovery grid displays the data from the file
    And "Loading..." is displayed while the data is being fetched
