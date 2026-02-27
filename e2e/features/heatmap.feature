Feature: Stand Stress Heatmap
  Scenario: Heatmap displays all stands and time buckets
    Given I am on the heatmap page
    Then I should see a grid with stand names as rows
    And I should see time bucket labels as columns
    And cells should be color-coded by stress level

  Scenario: Clicking a stand navigates to detail
    Given I am on the heatmap page
    When I click on a stand name
    Then I should be navigated to the stand detail page
