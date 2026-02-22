Feature: Discovery Management
  As an Analyst
  I want to create and edit discovery sessions
  So that I can organize my analysis work around a specific goal

  Non-goals:
  - Discovery deletion from the UI (only "New Discovery" replaces the current one)
  - Discovery listing or history
  - Multi-discovery navigation

  @fsid:FS-CreateNewDiscovery
  Scenario: Create a new discovery
    Given the Analyst is viewing the discovery grid
    When the Analyst clicks "New Discovery" in the toolbar
    And confirms the creation prompt
    Then a Discovery modal opens in "add" mode
    And the title and goal fields are empty
    And no editable date field is displayed

  @fsid:FS-SaveNewDiscovery
  Scenario: Save a new discovery
    Given the Discovery modal is open in "add" mode
    When the Analyst fills in the title and goal
    And clicks "Add"
    Then the discovery is created with the provided title and goal
    And the discovery has an auto-generated date
    And the discovery grid header displays the new title and goal
    And all entity collections (Inputs, Facts, Insights, Recommendations, Outputs) are empty

  @fsid:FS-EditDiscovery
  Scenario: Edit an existing discovery
    Given the Analyst is viewing a discovery with title "My Discovery"
    When the Analyst clicks "Edit Discovery Goal" in the toolbar
    Then a Discovery modal opens in "edit" mode
    And the title and goal fields are pre-filled with the current values
    And no editable date field is displayed

  @fsid:FS-SaveEditedDiscovery
  Scenario: Save an edited discovery
    Given the Discovery modal is open in "edit" mode with pre-filled values
    When the Analyst modifies the title or goal
    And clicks "Save"
    Then the discovery is updated with the new values
    And the date is preserved unchanged
    And existing entity collections are preserved unchanged

  @fsid:FS-CancelDiscoveryModal
  Scenario: Cancel the discovery modal
    Given the Discovery modal is open
    When the Analyst clicks "Cancel"
    Then the modal closes
    And no changes are applied to the discovery
