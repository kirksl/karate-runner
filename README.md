# Karate Runner

This extension will enable you to run Karate Tests and open Build Reports from Codelens and Activity Bar.

A Codelens will be added above each `Feature:`, `Scenario:` and `Scenario Outline:` keyword within each Karate feature file.  Clicking on the Codelens for a Feature test will run all Scenario and Scenario Outlines within the target feature file.  Clicking on the Codelens for a Scenario or Scenario Outline test will run only that Scenario or Scenario Outline.

A Karate Activity Bar will be added to VSCode.  Clicking on the Activity Bar will reveal a `Build Reports` and a `Tests` view.  Clicking on a report will open it within the default program defined for its file type.  Clicking on a Feature test will run all Scenario and Scenario Outlines within the target feature file.  Clicking on a Scenario or Scenario Outline test will run only that Scenario or Scenario Outline.

*Note: Karate Features and Scenarios marked with exclusions such as `@KarateOptions(tags = {"~@ignore"})` will not be run.*


## Setup
Please make sure you are running VSCode version 1.31.0 or greater. (Required)

Please make sure you are using Karate version 0.9.3 or greater in your Karate projects. (Required)

Goto the following path to configure this extension `Preferences > Settings > Search for Karate Runner`.


## Release Notes
0.0.1 - Initial release.

0.0.2 - Remove requirement for terminal to be set to the pom.xml directory prior to clicking on a Codelens.  We now traverse backwards from feature file until a pom.xml is found and call Maven with it.

0.0.3 - Remove requirement to specify a regular expression to determine where to show a Codelens.  A Codelens will now be shown above every `Feature:` and `Scenario:`.

0.1.0 - Add support for Gradle and Maven.  Please note the first pom.xml(Maven) or build.gradle(Gradle) found when traversing backwards from the *.feature file being tested will be used to run all Maven and Gradle commands.  This will also constitute your project root directory.  Add support to automatically open any file(s) once tests finish running.  For example you may want specific html reports to automatically load into a browser.  Add a Karate Activity Bar to VSCode to enable management of build reports and tests in a central location.

0.1.1 - Resolve project dependencies missing when publishing.

0.1.2 - Connect to Github Repo.