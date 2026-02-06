Feature: Relationship Visualization
  As an Analyst
  I want to see visual connections between related entities and highlight them on hover
  So that I can trace the reasoning chain from inputs to outputs

  Non-goals:
  - Drag-and-drop repositioning of entities
  - Graph layout algorithms (entities are displayed in fixed columns)
  - Filtering or hiding specific relationship lines
  - Zoom or pan on the discovery grid

  @fsid:FS-DrawRelationshipLines
  Scenario: Relationship lines are drawn between related entities
    Given a Discovery is loaded with entities that have relationships
    Then visual lines are drawn between each entity and its related entities in adjacent columns:
      | Source column    | Target column       | Relationship field         |
      | Inputs           | Facts               | fact.related_inputs        |
      | Facts            | Insights            | insight.related_facts      |
      | Insights         | Recommendations     | recommendation.related_insights |
      | Recommendations  | Outputs             | output.related_recommendations  |

  @fsid:FS-RedrawLinesOnResize
  Scenario: Relationship lines are redrawn on window resize
    Given a Discovery is loaded with relationship lines visible
    When the browser window is resized
    Then all relationship lines are recalculated and redrawn at the correct positions

  @fsid:FS-HighlightForwardOnHover
  Scenario: Hovering an entity highlights its downstream dependents
    Given a Discovery is loaded with entities and relationships
    When the Analyst hovers over an entity
    Then the entity is visually highlighted
    And all entities reachable by forward traversal are highlighted
    And the relationship lines connecting them are highlighted

  @fsid:FS-HighlightBackwardOnHover
  Scenario: Hovering an entity highlights its upstream sources
    Given a Discovery is loaded with entities and relationships
    When the Analyst hovers over an entity
    Then all entities reachable by backward traversal are highlighted
    And the relationship lines connecting them are highlighted

  @fsid:FS-RemoveHighlightOnLeave
  Scenario: Highlight is removed when the mouse leaves an entity
    Given an entity and its related entities are highlighted
    When the Analyst moves the mouse away from the entity
    Then the highlight is removed from the entity and all related entities
    And the relationship lines return to their default style

  @fsid:FS-ShowItemToolbarOnHover
  Scenario: Item toolbar appears on hover
    Given the Analyst is viewing an entity in the discovery grid
    When the Analyst hovers over the entity
    Then a toolbar with an edit icon appears on the entity
    When the Analyst moves the mouse away
    Then the toolbar is hidden
