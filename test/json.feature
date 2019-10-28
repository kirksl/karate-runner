Feature: A feature file to test json syntax higlighting

    Scenario: testing different ways of karate json syntax highlighting

        * def inlineJson = { test:"rtarst", "doubleQuoted" : "string", 'singleQuoted': "string", unquoted : "string", aBoolean: true }
        * def inlineJsonArray = [true, false,null,1233,12343.12121, "double", 'single quoted with spaces', { nested: "object"}]
        * def multiLineJson = 
        """
        {
            test:"rtarst",
            "doubleQuoted" : "string",
            'singleQuoted': "string",
            unquoted : "string",
            aBoolean: true,
            anArray: [
                true, false
            ],
            aNumber: 123412.121212,
            aInt: 1234,
            singleQuotedExpression: '#(inlinedSingleQuoteExpression)',
            doulbeQuotedExperssion: "#(full.javascript().syntax.support)",
            expression: #(config.myVar),
            invalid member name: "value",
            
        }
        
        """
            * string aString = "a String is true \" string  "
        * def multiLineJsonArray = 
        """
        [
            "double",
            "valid string with \" escaped string"
            'single',
            notValid,
            true,
            false,
            this is invalid,
            11111.0000E12,
            null,
            {
                nested: "object",
                boolean: "true"
            }
        ]
        """

    Scenario: Get
        * def kitnames = get cat $.kittens[*].name
        * def kitnums = get cat.kittens[*].id

        # the get shortcut with 
        And
        * def kitnums = $cat.kittens[*].id
        * def kitnames = $cat.kittens[*].name

        # plus index
        And
        * match actual == get[0] cat.kittens[*].id

    Scenario: Set
        * set myJson.foo = 'world'
        
        # add new keys.  you can use pure JsonPath expressions (notice how this is different from the above)
        * set myJson $.hey = 'ho'

        # and even append to json arrays (or create them automatically)
        * set myJson.zee[0] = 5

        # nested json ? no problem
        * set myJson.cat = { name: 'Billie' }

        * set cat /cat/name = 'Jean'
        * set xml/foo/bar = <hello>world</hello>

        And
        * def cat = { name: '' }
        * set cat
        | path   | value |
        | name   | 'Bob' |
        | age    | 5     |
        * match cat == { name: 'Bob', age: 5 }


    Scenario: Remove
        * def json = { foo: 'world', hey: 'ho', zee: [1, 2, 3] }
        * remove json.hey
        * remove json $.zee[1]

        * def xml = <foo><div>text </div><bar arg="content"><hello>world</hello></bar></foo>

        * remove xml/foo/bar/hello
        * remove xml /foo/bar

    Scenario: Replace
        * def text = 'hello <foo> world'
        * replace text.foo = 'bar'
        * match text == 'hello bar world'

        And
        * def text = 'hello <one> world <two> bye'
        * replace text
        | token | value   |
        | one   | 'cruel' |
        | two   | 'good'  |

        * match text == 'hello cruel world good bye'

        And
        * def text = 'hello <one> world ${two} bye'
        * def first = 'cruel'
        * def json = { second: 'good' }

        * replace text
            | token  | value       |
            | one    | first       |
            | ${two} | json.second |

        * match text == 'hello cruel world good bye'