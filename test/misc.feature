Feature: Test different misc karate sematics

    Background: Configuration

        * configure headers {userId: '1232'}
        * configure cookies functionCall(foo,bar)
        * configure logPrettyRequest true
        * configure logPrettyResponse false
        * configure printEnabled true
        * configure retry { count: 3}
        * configure report = { showLog: true, showAllSteps: false }
        * configure unknownParameter is.Allowed.but.marked.different
        * configure ssl = { keyStore: 'classpath:certstore.pfx', keyStorePassword: 'certpassword', keyStoreType: 'pkcs12' }        
        * configure ssl = { trustAll: true }


    Scenario: Asserts 
        * assert call.something(parameter)
        * assert true == true
        * assert {match: true} == response

    Scenario: match
        * match myJson == { foo: 'world', hey: 'ho', zee: [5, 6], cat: { name: 'Billie', "test": "super" } }
        * match myJson == { cat: { name: 'Billie' }, hey: 'ho', foo: 'world', zee: [5, 6] }
        * match myJson == { cat: '#ignore', hey: 'ho', foo: 'world', zee: [5, 6] }
        * match date == { month: '#? isValidMonth(_)' }

        And 
        * match cat / == <cat><name>Jean</name></cat>
        * match foo == bar
        * match test != { foo: 'baz' }

        # Multi line match..
        And 
        * match search ==
  """
  <acc:getAccountByPhoneNumber>
      <acc:phone foo="bar">
          <acc:number>1234</acc:number>
          <acc:number>5678</acc:number>
      </acc:phone>
      <acc:phoneNumberSearchOption>all</acc:phoneNumberSearchOption>        
  </acc:getAccountByPhoneNumber>
  """

        And
        * match temperature contains { fahrenheit: '#($.celsius * 1.8 + 32)' }
        * match hello contains 'World'
        * match hello !contains 'blah'

        And
        * match header Content-Type == 'application/json'
        * match header Content-Type contains 'application'

        And
        * match cat.kittens[*].id contains 23
        * match cat.kittens[*].id contains [42]
        * match cat.kittens[*].id contains [23, 42]
        * match cat.kittens[*].id contains [42, 23]
        * match data.foo contains only [3, 2, 1]
        * match data.foo contains only [2, 3, 1]
        * match data.foo contains any [9, 2, 8]

        * match each data.foo == { bar: '#number', baz: '#string'