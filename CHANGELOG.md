# Change Log
Notable changes to this project will be documented in this file.

## 0.9.9
Improve Karate Language support.  Fix issue where status bar and historical execution results fail to show classpath and re-execute tests.

## 0.9.8
Fix issue where `Inline Peek Editor` failed to discover files when project structure was not Java-based.  Add option to show test results within the gutter for feature files; next to each `Feature:`, `Scenario:` and `Scenario Outline:`.  Add `Karate Menu` to VSCode Editor Menu Bar for feature files.  Add options to `Karate Menu` to open Karate Runner settings, clear test results from Tests view and the gutter for feature files and to toggle showing test results within the gutter for feature files.  Update Tests view within Activity Bar with buttons to run and debug tests.

## 0.9.7
Add option to filter Build Reports and Tests views within Activity Bar.  Add option to open Karate Runner settings from Tests view.  Fix random sorting issue in Build Reports and Tests views.  Add icons to show pass/fail state of each Feature/Scenario/Scenario Outline within Tests view.  `Note this feature is dependent on Karate Version >= 1.0 and Karate providing result files under the root of your project within a /karate-reports directory.  Each file must end with a format of .karate-json.txt`  Add option to clear test results from Tests view.  Update execution results and status bar to support Karate 1.0.  `Note this feature is dependent on Karate providing a results file under the root of your project.  For Karate Version < 1.0 a file called results-json.txt.  For Karate Version >= 1.0 a file called karate-summary-json.txt`

## 0.9.6
Add option to run or debug individual tests within `Examples` table for `Scenario Outline`.  Hover over any row in Examples table to display `Karate: Run | Karate: Debug` codelens.  Add intellisense for Karate `read()` command to enumerate files in the same directory and within `<project root>/src/test/java`, `<project root>/src/test/resources`.  Remove requirement to set VSCode terminal to cmd.exe on Windows.  Task runner will always use cmd.exe regardless of user selection.

## 0.9.5
Add support for Gradle using Kotlin DSL syntax.

## 0.9.4
Update Maven command wrapping `-Dkarate.options=value` in quotes to address issues and guard against spaces in RValue.  Improve Karate Language coloring.

## 0.9.3
## 0.9.2
Add option to specify running with or without wrapper for Maven and Gradle from settings.

## 0.9.1
Update readme to align with changelog.  Update `debugPreSet` default value to align with new syntax.

## 0.9.0
Add option to specify command line arguments for Maven and Gradle from settings.  Improve Karate Language coloring.

## 0.8.9
## 0.8.8
Add busy indicators to Karate Activity Bar icon and to Tests view within Activity Bar when Karate tests are running.  Note this is not applicable when debugging a Karate test.

## 0.8.7
Fix issue where feature file and path were not enclosed with double quotes when running with Karate Jar.

## 0.8.6
Add support for `debugPreStep` property to Karate Debug Configurations coming in Karate 0.9.6.

## 0.8.5
Open Debug Configuration picker and launch.json if not previously setup when attempting to start a debug session from `Karate: Debug` Codelens.

## 0.8.4
Update `Karate: Standalone` Debug Configuration to utilize the same command line specified at `Karate Runner > Karate Jar: Command Line Args` in settings.

## 0.8.3
## 0.8.2
Fix conflicting `Key Bindings` for `Run Karate Test` and `Run All Karate Tests`.

## 0.8.1
Fix issue where Debug Configurations are using the incorrect pom.xml / build.gradle when there are multiple in a project.  Update Gradle command to filter tests using `--tests` instead of switch marked for deprecation `-Dtest`.

## 0.8.0
Add new Debug Codelens above each `Feature:`, `Scenario:` and `Scenario Outline:` to debug the applicable test or tests.

## 0.7.9
Fix issue where test resources were not being built when using Maven and Karate Cli.

## 0.7.8
Fix JS comments coloring issue when comments include Karate language.

## 0.7.7
Add `Syntax Highlighting` to enable bracket pairing and coloring for the Karate language within .feature files.  Additionally coloring will be enhanced within .js files to support Karate language integration.

## 0.7.3
Fix issue where new `Karate Cli` method of running tests always runs all Maven tests.

## 0.7.2
Add option to change `Key Bindings` if desired.

## 0.7.1
Add `Key Bindings` to enable running Karate tests from the keyboard.

## 0.7.0
Add option to view files referenced within a feature file within an `Inline Peek Editor`.

## 0.6.6
Add execution results to status bar.  Make status bar clickable to show historical results executed from Codelens or Activity Bar.  Make historical results clickable to re-execute command tied to results.  `Note this feature is dependent on Karate providing a results file called results-json.txt typically found under /<build directory>/surefire-reports`.

## 0.6.1
Add `Karate Language` via TextMate and integrate into Syntax Highlighting, Debug, Codelens and Code Folding.

## 0.5.5
Add option to override default Karate Runner with Karate Cli.  Karate Runner refers to the Java files used to run Karate tests.  See `Setup > Karate Cli` section and link to `Karate Cli` on Karate website for greater details.

## 0.5.3
Add option to cancel debug session while it's attempting to start.

## 0.5.2
Add `Display Shallow` and `Display Deep` actions to Build Reports and Tests views within Activity Bar.  Remove `clean` build task for Maven and Gradle from default debug configurations.  Add option to set `Debugger: Server Port Timeout` in settings and view timeout in UI while debugger starts.

## 0.5.1
Icon refresh to align with latest VSCode.

## 0.5.0
Remove reliance on feature files having to be `in focus` within IDE to start debugging.  See `Debug Setup` section for details.  **Note new debug configurations will need to be setup in launch.json.**  Add `Smart Paste` to detect when pasting into feature files via keyboard shortcut(eg Cmd+V).  Add `curl` detection to `Smart Paste` to transform curl commands into Karate syntax.  Add option to `Fold` or minimize each `Scenario:` or `Scenario Outline:`.

## 0.4.1
Add option to specify switches when debugging within `feature` property of `launch.json`.

## 0.4.0
Add option to debug feature files.  This feature requires `Karate Version 0.9.5`.  For Gradle users ensure you have setup a `karateExecute` task in `build.gradle` as defined in the `Setup Gradle` steps.

## 0.3.3
Remove `classpath:` from command when referencing fully qualified path to test(s).

## 0.3.2
Resolve [task execution issue](https://github.com/kirksl/karate-runner/issues/3) introduced in vscode 1.37 with workaround.

## 0.3.1
Add option to specify entire karate.jar(Standalone) command in settings.

## 0.3.0
Remove reliance on tests having to exist under `src/test/java` especially for karate.jar(Standalone).  Downstream this will simplify setting the property `Karate Runner > Tests: To Target` to something like `**/*.feature`.  Add `Run All Tests` action for every folder node that is an ancestor of a *.feature file within Activity Bar Tests view.  This will enable running all tests that are scoped below target folders and in scope based on the setting `Karate Runner > Tests: To Target`.

## 0.2.0
Add `Open In Editor` action for *.feature file nodes within Activity Bar Tests view.  Add `Collapse All` action to Build Reports and Tests views within Activity Bar.  Add support for Standalone execution mode via karate.jar.  Please note the first karate.jar(Standalone), pom.xml(Maven) or build.gradle(Gradle) found **in that order** when traversing backwards from the *.feature file will be used for execution.  This will also constitute your project root directory.

## 0.1.3
Hide tests that are commented from Codelens and Activity Bar.  Remember last Karate Runner when using `Prompt To Specify` Karate Runner popup.

## 0.1.2
Connect to Github Repo.

## 0.1.1
Resolve project dependencies missing when publishing.

## 0.1.0
Add support for Gradle and Maven.  Please note the first pom.xml(Maven) or build.gradle(Gradle) found when traversing backwards from the *.feature file being tested will be used to run all Maven and Gradle commands.  This will also constitute your project root directory.  Add support to automatically open any file(s) once tests finish running.  For example you may want specific html reports to automatically load into a browser.  Add a Karate Activity Bar to VSCode to enable management of build reports and tests in a central location.

## 0.0.3
Remove requirement to specify a regular expression to determine where to show a Codelens.  A Codelens will now be shown above every `Feature:` and `Scenario:`.

## 0.0.2
Remove requirement for terminal to be set to the pom.xml directory prior to clicking on a Codelens.  We now traverse backwards from feature file until a pom.xml is found and call Maven with it.

## 0.0.1
Initial release.