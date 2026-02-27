Feature: Executive Dashboard
  Scenario: Dashboard shows revenue metrics
    Given I am on the dashboard
    Then I should see "Total Revenue at Risk" KPI card
    And I should see "Recovery Potential" KPI card
    And I should see the top 3 bottleneck stands
    And I should see the top 3 stress windows
    And I should see the assumptions section
