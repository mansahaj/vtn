Feature: Game Selector
  Scenario: Default game is loaded on page visit
    Given I am on the dashboard
    Then I should see a game selected in the dropdown
    And I should see the attendance displayed

  Scenario: Switching games updates the forecast
    Given I am on the dashboard
    When I select a different game from the dropdown
    Then the dashboard KPI values should update
