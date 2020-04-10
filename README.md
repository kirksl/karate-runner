# Karate Runner
This extension will enable you to Open/Run/Debug Karate Tests and Build Reports by leveraging Codelens, Activity Bar, Debug and much more.

# 
## Features

### Codelens
A `Karate: Run` `Codelens` will be added above each `Feature:`, `Scenario:` and `Scenario Outline:` keyword within each Karate feature file.  Clicking on this Codelens for a Feature test will run all Scenario and Scenario Outlines within the target feature file.  Clicking on this Codelens for a Scenario or Scenario Outline test will run only that Scenario or Scenario Outline.

A `Karate: Debug` `Codelens` will be added above each `Feature:`, `Scenario:` and `Scenario Outline:` keyword within each Karate feature file.  Clicking on this Codelens for a Feature test will debug all Scenario and Scenario Outlines within the target feature file.  Clicking on this Codelens for a Scenario or Scenario Outline test will debug only that Scenario or Scenario Outline.

### Activity Bar
A `Karate Activity Bar` will be added to VSCode.  Clicking on the Activity Bar will reveal a `Build Reports` and a `Tests` view.  Clicking on a report will open it within the default program defined for its file type.  Clicking on a Feature test will run all Scenario and Scenario Outlines within the target feature file.  Clicking on a Scenario or Scenario Outline test will run only that Scenario or Scenario Outline.

*Note: Karate Features and Scenarios marked with exclusions such as `@KarateOptions(tags = {"~@ignore"})` will not be run.*

### Debug
`Karate Debug Configurations` will be added to `Debug and Run Activity Bar`.  See `Setup > Debug` section below for setup details.  Following setup starting the debugger will enable you to use all debug controls to step through and debug your feature files.

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

# 
## Setup

### General
Please make sure you are using `VSCode Version 1.36.0` or greater. (Required)
Please make sure you are using `Karate Version 0.9.3` or greater in your Karate projects. (Required)
Goto the following path to configure this extension `Preferences > Settings > Search for Karate Runner`.

*Note if you are on Windows additionally you need to set `cmd.exe` as your default terminal by opening up a terminal in VSCode, clicking the dropdown in the upper right corner of the terminal view, selecting `Select Default Shell` and selecting `C:\WINDOWS\System32\cmd.exe` in the command palette that opens up.*

### Debug
Please make sure you are using `Karate Version 0.9.5` or greater in your Karate projects.  (Required to enable debug mode)
*Note the following steps are subject to change as VSCode and other tools evolve.*

#### VSCode
- Click `Debug` icon in Activity Bar to open debugger.
- Click `Gear/Cog` icon at the top and click `Karate (debug)` to open launch.json.
- Click `Add Configuration` button to add debug configurations as needed.
  - Click `Karate (debug): Gradle` to add Gradle debug.
  - Click `Karate (debug): Maven` to add Maven debug.
- Edit debug configurations as needed.
  - Note `feature` property is used to find project root if multiple projects are loaded in IDE.  Additionally used by Karate Debug Server if `karateOptions` property not specified.  Recommend default setting which finds feature files opened in IDE.
  - Note `karateOptions` is used only by Karate Debug Server.  Overrides `feature` property to enable advanced debugging and specifying all Karate Options(classpath, threads, tags).
 - Next to `Gear/Cog` icon expand dropdown and select debug configuration to use.

#### Gradle (If applicable)
- Open build.gradle for target project.
- Add the following task to build.gradle.
    ```java
    task karateExecute(type: JavaExec) {
        classpath = sourceSets.test.runtimeClasspath
        main = System.properties.getProperty('mainClass')
    }
    ```

#### Debug Project
- Set breakpoint(s) within feature file(s).
- Keep feature file(s) opened in editor. (Recommended)
- Start debugging by clicking either a `Karate: Debug` Codelens or by clicking `Start Debugging` within the `Debug Activity`.

### Karate Cli
Please make sure you are using `Karate Version 0.9.5` or greater in your Karate projects.  (Required to enable this feature)

[Karate Cli](https://github.com/intuit/karate/wiki/Debug-Server#karate-cli) is a slated replacement to the `Karate Runner` feature within Karate.  A Karate Runner(same name as this extension) is a Java file that specifies Karate tests to run.  By using `Karate Cli` Java files are no longer used to run tests.  Finally Karate Cli is a work in progress and does not currently generate things like the Cucumber Report and will build only to a /target directory.

#### Setup Gradle (If applicable)
- Open build.gradle for target project.
- Add the following task to build.gradle.
    ```java
    task karateExecute(type: JavaExec) {
        classpath = sourceSets.test.runtimeClasspath
        main = System.properties.getProperty('mainClass')
    }
    ```

#### Enable Karate Cli
- Open Extension Settings in VSCode.
- Add a check mark to `Karate Runner > Karate Cli: Override Karate Runner`.

#### Configure Karate Cli
- Open Extension Settings in VSCode.
- Set `Karate Runner > Karate Cli: Command Line Args` as defined at [Karate Options](https://github.com/intuit/karate/wiki/Debug-Server#karate-options).
- This extension will handle all Maven and Gradle build commands, setting the command line with the feature file being tested and suffixing the feature file with a ':number' when running individual Scenarios.
- Remove `Karate Runner` Java files from your project.  If not removed all tests in your project will run regardless of which test(s) you choose to run.
