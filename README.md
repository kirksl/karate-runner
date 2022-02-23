# Karate Runner

#### [Repository](https://github.com/kirksl/karate-runner)&nbsp;&nbsp;|&nbsp;&nbsp;[Issues](https://github.com/kirksl/karate-runner/issues)&nbsp;&nbsp;|&nbsp;&nbsp;[Milestones](https://github.com/kirksl/karate-runner/milestones)&nbsp;&nbsp;|&nbsp;&nbsp;[Karate](https://github.com/karatelabs/karate)

![Badge](https://img.shields.io/visual-studio-marketplace/v/kirkslota.karate-runner) ![Badge](https://img.shields.io/visual-studio-marketplace/last-updated/kirkslota.karate-runner) ![Badge](https://img.shields.io/github/issues/kirksl/karate-runner)

Open/Run/Debug Karate Tests and Reports by leveraging Codelens, Activity Bar, Debugger and much more.


## Sponsors
[![Karate](https://raw.githubusercontent.com/kirksl/karate-runner/master/resources/karate.png)](https://github.com/karatelabs/karate)<br />
This project is proudly sponsored by [Karate](https://github.com/karatelabs/karate).  The only open-source tool to combine API test-automation, mocks, performance-testing and even UI automation into a single, unified framework.

[Sponsor Karate](https://github.com/sponsors/ptrthomas)<br />
[Sponsor Karate Runner](https://github.com/sponsors/kirksl)

## Contributing
First and foremost thank you to all [Contributors](https://github.com/kirksl/karate-runner/graphs/contributors).  We highly appreciate your time and help to improve this project.  For first time contributions our rules are uber simple.  Clone this project, create your own branch and submit a PR.  Optionally you can also fork this project.  Thank you for considering us and happy coding!

## Features

### Codelens
A `Karate: Run` and `Karate: Debug` `Codelens` will be added above each `Feature:`, `Scenario:` and `Scenario Outline:` within each feature file.  Clicking on a Feature Codelens will run/debug all Scenario and Scenario Outlines within its feature file.  Clicking on a Scenario or Scenario Outline Codelens will run/debug only that Scenario or Scenario Outline.

`Codelens` will additionally be shown when hovering over any row within an `Examples:` table for a `Scenario Outline:`.  Clicking here will run/debug only the currently hovered over row.

### Activity Bar
A `Karate` `Activity Bar` will be added to VSCode.  Clicking on the Activity Bar will reveal `Reports` and `Tests` views.  Both views can be displayed as a `Flat` list or `Tree` structure.  The `Tests` view can additionally be displayed in an aggregated `Tags` view.  Clicking on a report within the `Reports` view will open it within the default program defined for its file type.  Clicking on a test within the `Tests` view will open it for viewing within the VSCode Editor.  Hovering over any node within the `Tests` view will provide a list of actions/buttons that can be clicked to run/debug/view tests.

*Note: Clicking `Run All Tests` will run all tests applicable to the given node type (Tag, Folder, File, Feature) in the `Tests` view regardless of the currently set filter.  This is especially applicable when filtering by tag.*

*Note: Tests annotated with the `@ignore` tag will be shown as `ignored` in the `Tests` view and will not be run.*

### Debugger
`Karate` `Debug Configurations` will be added to `Debug/Run` `Activity Bar`.  See `Setup > Debugger` section below for setup details.  Starting the debugger after setup will enable you to use all debug controls to step through and debug your feature files.

### Smart Paste
A `Smart Paste` option will be added to detect paste operations into feature files.  If a `curl` command is detected it will be transformed into Karate syntax and pasted into the VSCode Editor.

### Status Bar
A `Karate` `Status Bar` will be added to VSCode showing results for the last execution.  The `Karate` `Status Bar` background will additionally be colored red when the last execution's failure percentage exceeds the defined threshold in Karate Runner settings.   Clicking `Karate` `Status Bar` will reveal historical results executed from `Codelens` or `Karate` `Activity Bar`.  Clicking historical results will re-execute the command which produced those results.

*Note this feature is dependent on Karate providing a results file under the root of your project.*
*For Karate Version < 1.0 a file called results-json.txt*
*For Karate Version >= 1.0 a file called karate-summary-json.txt*

### Test Results (Karate 1.0 or greater)
Test Results will be shown for each `Feature:`, `Scenario:`, `Scenario Outline:` and parent folder in the `Tests` view.  And will be shown for each `Feature:`, `Scenario:`, `Scenario Outline:` within each Feature file.

Test Results will be represented in three ways.  By a Karate icon with a green dot (pass) or red dot (fail), with failure details on hover and finally a failure count showing how many failures are below each folder or file in the `Tests` view.

Test Results are rolling results meaning they will accumulate and reset only when you click `Clear Results`.

*Note this feature is dependent on Karate Version >= 1.0 and Karate providing result files under the root of your project within a /karate-reports directory.  Each file must end with a format of `.karate-json.txt`.*

### Editor Menu Bar
A `Karate` `Editor Menu` will be added to the VSCode Editor Menu Bar for feature files.  A menu option will be added to open Karate Runner settings, clear test results from Tests view and the gutter for feature files and finally to toggle showing test results within the gutter for feature files.

### Peek
A `Peek` option will be added to the `Control-Click` or `Right-Click` context menu in the VSCode Editor.  Clicking `Peek > Peek Definition` on a string or reference (or any combination of if concat'd) which equates to an existing file will display the contents of that file within an `Inline Peek Editor`.  

*Note if the path being peeked starts with classpath: this extension will search recursively within the target project to find the file, searching first within `<project root>/src/test`, followed by `<project root>/src` and ending with `<project root>/`*

### Key Bindings
`Key Bindings` will be added to enable running Karate tests and Smart Paste from the keyboard.

`Smart Paste`
- Requirement: Open any file in VSCode Editor and ensure editor has focus.
- Windows: `Ctrl+V`
- Linux: `Ctrl+Shift+V`
- Mac: `Cmd+V`

`Run Karate Test`
- Requirement: Open a feature file in VSCode Editor and ensure a line associated with a test has cursor focus.
- Windows: `Ctrl+R+1`
- Linux: `Ctrl+Shift+R+1`
- Mac: `Cmd+R+1`

`Run All Karate Tests`
- Requirement: Open a feature file in VSCode Editor and ensure editor has focus.
- Windows: `Ctrl+R+A`
- Linux: `Ctrl+Shift+R+A`
- Mac: `Cmd+R+A`

*Note key bindings can be changed if desired by going to Menu > Preferences > Keyboard Shortcuts*

### Syntax Highlighting
`Syntax Highlighting` will be added to enable bracket pairing and coloring for the Karate language within .feature files.  Additionally coloring will be enhanced within .js files to support Karate language integration.

*Note this is a work in progress as the Karate Language and VSCode Themes evolve.*

### Intellisense
`Intellisense` will be added to the Karate `read()` command to enumerate all files in the same directory.  Additionally if `<project root>/src/test/java`,  `<project root>/src/test/resources` exist, all files within those directories will be enumerated.


## Setup

### Versions
- `VSCode Version 1.63.0` or greater. (Required)
- `Karate Version 0.9.3` or greater in your Karate projects. (Required)
- `Karate Version 0.9.5` or greater in your Karate projects. (Required for Debugger or Karate Cli)
- `Karate Version 1.0.0` or greater in your Karate projects. (Required for Tests View results)

### This Extension
- Goto the following path to configure all workspace settings for this extension `Preferences > Settings > Search for Karate Runner` or click the gear icon in the header of the Tests View.

### Execution
- Ensure an `execution option` (`karate.jar`, `pom.xml (Maven)`, `build.gradle (Gradle Groovy)`, `build.gradle.kts (Gradle Kotlin)`) exists at the root of your project.
- This extension will detect which `execution option` exists at your project root and execute the appropriate command.
- Note if multiple `execution options` exist `karate.jar` will be favored and used first, followed by `pom.xml (Maven)`, then `build.gradle (Gradle Groovy)` and lastly `build.gradle.kts (Gradle Kotlin)`.

### Debugger
*To setup from a feature file's Codelens*
- Click `Karate: Debug` Codelens in any feature file.
- Click `Karate (debug)` option from popup.
- Click `Add Configurations` in launch.json to edit configurations if needed.
  - Click `Karate (debug): Gradle` to add Gradle debug.
  - Click `Karate (debug): Maven` to add Maven debug.
- Edit debug configurations as needed.
  - Note `feature` property is always used to find project root if multiple projects are loaded in IDE.
  - Note `feature` property is also used by Karate Debug Server if `karateOptions` property is not set.
  - Recommend default value for `feature` property which dynamically finds opened feature files.
  - Note `karateOptions` is used by Karate Debug Server to enable advanced debugging and specify all Karate Options.
- Click `Debug` icon in Activity Bar to open debugger.
- Next to `Gear/Cog` icon expand dropdown and select debug configuration to use.
- See `### Gradle` section at the bottom if applicable.

*To setup from VSCode Debug/Run Activity*
- Click `Debug/Run` icon in Activity Bar to open debugger.
- Click `Gear/Cog` icon at the top.
- Follow same steps above for setting up from a feature file except for first Codelens step.

### Karate Cli
- Note [Karate Cli](https://github.com/karatelabs/karate/wiki/Debug-Server#karate-cli) is a work in progress feature to eliminate the need for Java files as runners.
- Open `Preferences > Settings > Search for Karate Runner`.
- Enable by adding check mark to `Karate Runner > Karate Cli: Override Karate Runner`.
- [Configure](https://github.com/karatelabs/karate/wiki/Debug-Server#karate-options) by setting `Karate Runner > Karate Cli: Command Line Args`.
- Note this extension will handle all Maven and Gradle commands and specifying the feature file(and line number if needed).
- See `### Gradle` section at the bottom if applicable.

### Karate Jar
- Open `Preferences > Settings > Search for Karate Runner`.
- [Configure](https://github.com/karatelabs/karate/tree/master/karate-netty#standalone-jar) the Karate Standalone Jar by setting `Karate Runner > Karate Jar: Command Line Args`.

### Gradle (If Applicable)
- Required for Debugger and Karate Cli.
- If using Groovy DSL:
  - Open `build.gradle` for target project.
  - Add the following task to `build.gradle`:
    ```java
    task karateExecute(type: JavaExec) {
        classpath = sourceSets.test.runtimeClasspath
        main = System.properties.getProperty('mainClass')
    }
    ```
- If using Kotlin DSL:
  - Open `build.gradle.kts` for target project.
  - Add the following task to `build.gradle.kts`:
    ```java
    tasks.register<JavaExec>("karateExecute") {
        classpath = sourceSets.test.get().runtimeClasspath
        main = System.getProperty("mainClass")
    }
    ```

### Sample Projects
[Karate Sample Projects](https://github.com/karatelabs/karate/tree/master/examples)<br />
[Karate Runner Sample Project](https://github.com/kirksl/karate-maven-gradle)

### License
Licensed under the [MIT](LICENSE) license.
