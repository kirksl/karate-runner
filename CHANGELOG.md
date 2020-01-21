# Change Log
Notable changes to this project will be documented in this file.

## 0.7.0
Add option to view files referenced within a feature file within an `Inline Peek Editor`.

## 0.6.6
Add execution results to status bar.  Make status bar clickable to show historical results executed from Codelens or Activity Bar.  Make historical results clickable to re-execute command tied to results.  `Note this feature is dependent on Karate providing a results file called results-json.txt typically found under /<build directory>/surefire-reports`.

## 0.6.1
Add `Karate Language` via TextMate and integrate into syntax highlighting, debug, codelens and code folding.

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