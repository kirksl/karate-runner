Feature: to test karate http, request and response functions like headers, url, params, request, repsonse aso.

  Scenario: url 
    Given url 'https://myhost.com/v1/cats'
    Given url 'https://' + e2eHostName + '/v1/api'

  Scenario: path
    Given path 'documents/' + documentId + '/download'

    # this is equivalent to the above
    Given path 'documents', documentId, 'download'

    # or you can do the same on multiple lines if you wish
    Given path 'documents'
    And path documentId
    And path 'download'

  Scenario: request
    * request formVariable
    * request <xml><</xml>
    Given request { name: 'Billie', type: 'LOL' }
    * request read('my-json.json')
    * request ''
    * request "just a string"  

  Scenario: http methods
    * method get
    * method put
    * method post
    * method delete
    * method head
    * method patch
    * method trace
    * method options
    * method connect
    * method PUT
    * method POST    
    * method does not exit

    * def putOrPost = (someVariable == 'dev' ? 'put' : 'post')
    * method putOrPost

  Scenario: status
    * status 200
    * status 403
    * status 4001
    * status illegal

  Scenario: soap action
     When soap    action 'http://tempuri.org/Add'
     When soap  action actionAsVariable


  Scenario: retry until
    And retry    until response.id > 3
    And retry until responseStatus == (200 && response.id > 3)


  Scenario: param and params
    * param test = 'super'
    * param multiValueParam = 'mp.', 'pink'
    * param test = {not: 'json', }
    * params { searchBy: 'client', active: true, someList: [1, 2, 3] }


  Scenario: header and heades
    * header test = variable
    * header userId = "0123455"
    * header userId = 123455
    * header functionCall = superFunction(foo, bar)
    * headers { Authorization: 'sometoken', tx_id: '1234', extraTokens: ['abc', 'def'] }
    * headers fromVariable

  Scenario: form field and fields, multipart field and fields, file and files
    * form field foo = "bar"
    * form field mr = pinkVariable
    * form fields { username: '#(user.name)', password: 'secret', projects: ['one', 'two'] }
    * form fields aVariable

    And
    * multipart field test = "field"
    * multipart fields {this: "other", mr: "pink"}

    And
    * multipart file this = read("classpath:afile.png")
    * multipart files aVariable
    * multipart files { read: 'test2.pdf', filename: 'upload-name2.pdf', contentType: 'application/pdf' }

    And
    * multipart entity { read: 'test2.pdf', filename: 'upload-name2.pdf', contentType: 'application/pdf' }
    * multipart entity read('foo.json')

  Scenario: Cookies 
    * cookie foo = "bar"
    * cookie onePlusOne = 1 + 1
    * cookie reset = null
    * cookies fromVariable
    * cookies { someKey: 'someValue', foo: 'bar' }