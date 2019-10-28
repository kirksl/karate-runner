Feature: Test all different karate types

    Scenario:

        * def text = "this is generic text"
        * json json = {"foo":"bar"}
        * copy jsonCopy = json
        * csv readFrom = read('classpath:aFile.csv')
        * bytes rawData = read('classpath:aFile.img')
        * xml xmlSupport = <xml attr="value"></xml>
        * xmlstring xmlString = <xml attr="value"></xml>
        * text this =
        """
            this is just a multi line string
        """

        # Didn't find a way of supporting all the different embedded syntaxes in triple quote strings
        * text graphQlNeedsTextBecauseItsNotJson = 
        """
        {
            hero(name: "<name>") {
                height
                mass
            }
        }
        """        

        # Table support works right away, same rule applies as for Examples:
        * table catsarstart 
        | name   | age |
        | 'Bob'  | 2   |
        | 'Wild' | 4   |
        | 'Nyan' | 3   |
        