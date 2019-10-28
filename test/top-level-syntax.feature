@ignore
Feature: This feature file covers different karate language feature to test vscode syntax highlighting
    
    # Karate supports line comment starts with a #
    # Block comments are not supported

    Background: Description of background may contain any charater { } < >   (  )
        Given
        When
        Then
        And
        But
        * match each response contains { test: '#notnull' }
    

    Scenario : without a directly followed colone is invalid and not recognized as a scenario

    @Tags may not contain whitespaces
    Scenario: Tags may not contain whitespaces
    
    @ButTagMayHave(){}<>Characters
    Scenario: Tags may not contain whitespaces

    Scenario: It' allowed to have 
        multiline scenario titles. 
        This makes it very diffecult to check for invalid statements.
        This must be implemented in a form of semantic language rules.

    Scenario: Given when then
        Given
        When
        Then
        And
        But
        # Blank lines..

        * test

    Scenario Outline: Outline Title        

    @region=US
    Examples: Example title for "US" data
        | expected |        
        | US       | 

    @region=GB
    Examples: Example title for "GB" data
        | expected |
        | GB       |
