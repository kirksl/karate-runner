# Karate Runner
This extension will enable you to Open/Run/Debug Karate Tests and Build Reports by leveraging Codelens, Activity Bar, Debugger and much more.


## Features

### Codelens
A `Karate: Run` `Codelens` will be added above each `Feature:`, `Scenario:` and `Scenario Outline:` keyword within each Karate feature file.  Clicking on this Codelens for a Feature test will run all Scenario and Scenario Outlines within the target feature file.  Clicking on this Codelens for a Scenario or Scenario Outline test will run only that Scenario or Scenario Outline.

A `Karate: Debug` `Codelens` will be added above each `Feature:`, `Scenario:` and `Scenario Outline:` keyword within each Karate feature file.  Clicking on this Codelens for a Feature test will debug all Scenario and Scenario Outlines within the target feature file.  Clicking on this Codelens for a Scenario or Scenario Outline test will debug only that Scenario or Scenario Outline.

### Activity Bar
A `Karate Activity Bar` will be added to VSCode.  Clicking on the Activity Bar will reveal a `Build Reports` and a `Tests` view.  Clicking on a report will open it within the default program defined for its file type.  Clicking on a Feature test will run all Scenario and Scenario Outlines within the target feature file.  Clicking on a Scenario or Scenario Outline test will run only that Scenario or Scenario Outline.

*Note Karate Features and Scenarios marked with exclusions such as `@KarateOptions(tags = {"~@ignore"})` will not be run.*

### Debugger
`Karate Debug Configurations` will be added to `Debug/Run Activity Bar`.  See `Setup > Debugger` section below for setup details.  Following setup starting the debugger will enable you to use all debug controls to step through and debug your feature files.

### Smart Paste
A `Smart Paste` option will be added to detect paste operations into feature files.  If a `curl` command is detected it will be transformed into Karate syntax and pasted into the VSCode Editor.

### Status Bar
A `Karate Status Bar` will be added to VSCode showing execution results.  Clicking `Karate Status Bar` will reveal historical results executed from `Codelens` or `Karate Activity Bar`.  Clicking historical results will re-execute the command which produced those results.

*Note this feature is dependent on Karate providing a results file called results-json.txt typically found under /build directory/surefire-reports*

### Peek
A `Peek` option will be added to the `Control-Click` or `Right-Click` context menu in the VSCode Editor.  Clicking `Peek > Peek Definition` on a string or reference (or any combination of if concat'd) which equates to an existing file will display the contents of that file within an `Inline Peek Editor`.  

*Note if the path being peeked starts with classpath: this extension will search recursively within the target project to find the file, searching first within /project root/src/test, followed by /project root/src and ending with /project root/*

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

*Note this is a work in progress as the Karate language grows and custom IDE themes come to market.*


## Setup

### Versions
- `VSCode Version 1.36.0` or greater. (Required)
- `Karate Version 0.9.3` or greater in your Karate projects. (Required)
- `Karate Version 0.9.5` or greater in your Karate projects. (Required for Debugger or Karate Cli)

### This Extension
- Goto the following path to configure all settings for this extension `Preferences > Settings > Search for Karate Runner`.

### Debugger

- To setup from a feature file's Codelens...
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

&nbsp;

- To setup from VSCode Debug/Run Activity...
- Click `Debug/Run` icon in Activity Bar to open debugger.
- Click `Gear/Cog` icon at the top.
- Follow same steps above for setting up from a feature file except for first Codelens step.

### Karate Cli
- Note [Karate Cli](https://github.com/intuit/karate/wiki/Debug-Server#karate-cli) is a work in progress feature to eliminate the need for Java files as runners.
- Open `Preferences > Settings > Search for Karate Runner`.
- Enable by adding check mark to `Karate Runner > Karate Cli: Override Karate Runner`.
- [Configure](https://github.com/intuit/karate/wiki/Debug-Server#karate-options) by setting `Karate Runner > Karate Cli: Command Line Args`.
- Note this extension will handle all Maven and Gradle commands and specifying the feature file(and line number if needed).
- See `### Gradle` section at the bottom if applicable.

### Gradle (If Applicable)
- Required for debugger and Karate Cli.
- Open build.gradle for target project.
- Add the following task to build.gradle.
    ```java
    task karateExecute(type: JavaExec) {
        classpath = sourceSets.test.runtimeClasspath
        main = System.properties.getProperty('mainClass')
    }
    ```

### Windows (If applicable)
- Required as only `cmd.exe` is supported on Windows.
- Open a terminal in VSCode.
- Click dropdown in terminal (typically located in the upper right).
- Click `Select Default Shell`.
- Click `Command Prompt` in the popup.