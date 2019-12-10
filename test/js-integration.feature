Feature: Test the js integration in combination with special karate function

    Scenario: Call feature
        * def test = call read('classpath:jsFile.js')
        * def test = callonce reaId('classpath:jsFile.js')
        * def foo = call bar { baz: '#(ban)' }
        
        # note the use of 'callonce' instead of 'call'
        * def result = callonce read('../callarray/kitten-create.feature') kittens
    
    Scenario: Js Multiline
        * def aJsFunction = 
        """
            function(a,b) {
                return a + b;
            }
        """
