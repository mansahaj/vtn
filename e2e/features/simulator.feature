Feature: Staff Redeployment Simulator
  Scenario: Changing staff count triggers recalculation
    Given I am on the simulator page
    When I increase the staff count for a stand
    Then the revenue at risk should decrease or change
    And recommended moves should be displayed

  Scenario: Applying a recommended move updates staff counts
    Given I am on the simulator page
    And I can see recommended moves
    When I click "Apply" on a recommended move
    Then the staff counts should update accordingly
