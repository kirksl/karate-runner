# Karate Runner

This extension will enable you to run/debug Karate Tests and open Build Reports from Codelens and Activity Bar.

A Codelens will be added above each `Feature:`, `Scenario:` and `Scenario Outline:` keyword within each Karate feature file.  Clicking on the Codelens for a Feature test will run all Scenario and Scenario Outlines within the target feature file.  Clicking on the Codelens for a Scenario or Scenario Outline test will run only that Scenario or Scenario Outline.

A Karate Activity Bar will be added to VSCode.  Clicking on the Activity Bar will reveal a `Build Reports` and a `Tests` view.  Clicking on a report will open it within the default program defined for its file type.  Clicking on a Feature test will run all Scenario and Scenario Outlines within the target feature file.  Clicking on a Scenario or Scenario Outline test will run only that Scenario or Scenario Outline.

*Note: Karate Features and Scenarios marked with exclusions such as `@KarateOptions(tags = {"~@ignore"})` will not be run.*


## General Setup
Please make sure you are using `VSCode Version 1.36.0` or greater. (Required)

Please make sure you are using `Karate Version 0.9.3` or greater in your Karate projects. (Required)

Goto the following path to configure this extension `Preferences > Settings > Search for Karate Runner`.

## Debug Setup
Please make sure you are using `Karate Version 0.9.5` or greater in your Karate projects.  (Required to enable debug mode)

*Note the following steps are subject to change as VSCode and other tools evolve.*

#### Setup VSCode
- Click `Debug` icon in Activity Bar to open debugger.
- Click `Gear/Cog` icon at the top and click `Karate (debug)` to open launch.json.
- Click `Add Configuration` button to add debug configurations as needed.
  - Click `Karate (debug): Gradle` to add Gradle debug.
  - Click `Karate (debug): Maven` to add Maven debug.
- Edit debug configurations as needed.
  - Note `feature` property is used to find project root if multiple projects are loaded in IDE.  Additionally used by Karate Debug Server if `karateOptions` property not specified.  Recommend default setting which finds feature files opened in IDE.
  - Note `karateOptions` is used only by Karate Debug Server.  Overrides `feature` property to enable advanced debugging and specifying all Karate Options(classpath, threads, tags).
 - Next to `Gear/Cog` icon expand dropdown and select debug configuration to use.

#### Setup Gradle (If applicable)
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
- Start debugging.

## Karate Cli Setup
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