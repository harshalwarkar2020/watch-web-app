# Source of truth: auth-max-password-bytes-design.md (EPMCDMETST-67287, PR #3)
# Deviation: the login username cap was later loosened from 30 to 255 characters
# so accounts created before the register limits existed can still sign in.
#
# Automation map
#   @ui  -> tests/e2e/credential-validation.ui.spec.ts   (browser, page-object based)
#   @api -> tests/e2e/credential-validation.api.spec.ts  (Playwright `request` fixture, bypasses the UI)
# Every scenario carries a stable @CV-nn id; the same id prefixes the Playwright test title.
#
# Notation used in Examples tables
#   ascii(n)       n random ASCII characters (1 byte each)
#   "é" x n        the character U+00E9 repeated n times (2 bytes each in UTF-8)
#   "€" x n        U+20AC (3 bytes each)
#   "😀" x n       U+1F600 (4 bytes each, 2 UTF-16 code units)
#   Usernames and passwords are generated per test; usernames are unique per test.

Feature: Credential validation on register and login
  As a visitor of Book the Watch
  I want registration and login to enforce sensible credential limits
  So that passwords are never silently truncated by bcrypt and oversized input is rejected cheaply

  Limits under test
    Register  username: required, at most 30 characters
    Register  password: at least 8 characters, at most 72 UTF-8 bytes (bcrypt truncation limit)
    Login     username: at most 255 characters (looser, for legacy accounts)
    Login     password: at most 512 UTF-8 bytes; larger input gets HTTP 400 before bcrypt runs
    Client    mirrors these limits and blocks submission (no network request); it does NOT enforce
              the register minimum of 8 characters, the backend does
    Wrong credentials remain HTTP 401 {"error":"invalid credentials"}

  # =====================================================================
  # UI - Registration form
  # =====================================================================

  Rule: Browser behavior - the forms mirror the limits and the server enforces the rest

  Background:
    Given the Book the Watch frontend is open at "/"

  @ui @smoke @happy-path @CV-01
  Scenario: A visitor registers with valid credentials and can then log in
    Given the visitor is on the "Registration form"
    When they register with a unique username and a valid password of 12 characters
    Then a status message "registration successful" is shown
    When they switch to the "Login form" and log in with the same credentials
    Then the page shows "Logged in as" followed by their username

  @ui @boundary @CV-02
  Scenario Outline: Register username length boundary is 30 characters
    Given the visitor is on the "Registration form"
    When they submit a unique username of <length> characters and a valid password
    Then <outcome>

    Examples:
      | length | outcome                                                                                  |
      | 30     | the request is accepted and the status "registration successful" is shown                |
      | 31     | no request is sent and the alert "Username must be at most 30 characters" is shown       |

  @ui @boundary @CV-03
  Scenario: Register username limit counts characters, not bytes
    Given the visitor is on the "Registration form"
    When they submit a unique username of exactly 30 characters, padded with "é" so it is longer than 30 bytes
    Then the request is accepted and the status "registration successful" is shown

  @ui @boundary @multibyte @CV-04
  Scenario Outline: Register password byte-length boundary is 72 UTF-8 bytes
    Given the visitor is on the "Registration form"
    When they submit a unique username and the password <password>
    Then <outcome>

    Examples: ASCII
      | password                | bytes | outcome                                                                                   |
      | ascii(72)               | 72    | the request is accepted and the status "registration successful" is shown                 |
      | ascii(73)               | 73    | no request is sent and the alert "Password must be at most 72 bytes" is shown             |

    Examples: Multi-byte
      | password                | bytes | outcome                                                                                   |
      | "é" x 36                | 72    | the request is accepted and the status "registration successful" is shown                 |
      | "é" x 37                | 74    | no request is sent and the alert "Password must be at most 72 bytes" is shown             |
      | "€" x 24                | 72    | the request is accepted and the status "registration successful" is shown                 |
      | "€" x 25                | 75    | no request is sent and the alert "Password must be at most 72 bytes" is shown             |
      | "😀" x 18               | 72    | the request is accepted and the status "registration successful" is shown                 |
      | "😀" x 19               | 76    | no request is sent and the alert "Password must be at most 72 bytes" is shown             |
      | ascii(70) + "é"         | 72    | the request is accepted and the status "registration successful" is shown                 |
      | ascii(71) + "é"         | 73    | no request is sent and the alert "Password must be at most 72 bytes" is shown             |

  @ui @boundary @client-gap @CV-05
  Scenario Outline: Register minimum password length is enforced by the server, not the client
    Given the visitor is on the "Registration form"
    When they submit a unique username and a password of <chars> ASCII characters
    Then the request IS sent to the server
    And <outcome>

    Examples:
      | chars | outcome                                                                                  |
      | 7     | the server answers HTTP 400 {"error":"password must be at least 8 characters"}           |
      | 8     | the server answers HTTP 201 and the status "registration successful" is shown             |

  @ui @negative @CV-06
  Scenario Outline: Register blocks missing required fields on the client
    Given the visitor is on the "Registration form"
    When they submit username "<username>" and password "<password>"
    Then no request is sent
    And the alert "Username and password are required" is shown

    Examples:
      | username   | password  | note                       |
      |            |           | both empty                 |
      | <unique>   |           | password empty             |
      |            | <valid>   | username empty             |
      | <spaces>   | <valid>   | username whitespace only   |

  # =====================================================================
  # UI - Login form
  # =====================================================================

  @ui @smoke @happy-path @CV-10
  Scenario: A registered user logs in with valid credentials
    Given an account exists (created via the API)
    And the visitor is on the "Login form"
    When they log in with that username and password
    Then the page shows "Logged in as" followed by their username

  @ui @negative @CV-11
  Scenario: Wrong password is reported as invalid credentials
    Given an account exists (created via the API)
    And the visitor is on the "Login form"
    When they log in with that username and a different valid password
    Then the request is sent and answered with HTTP 401 {"error":"invalid credentials"}

  @ui @boundary @multibyte @CV-12
  Scenario Outline: Login password byte-length boundary is 512 UTF-8 bytes
    Given the visitor is on the "Login form"
    When they submit a unique username and the password <password>
    Then <outcome>

    Examples: At the limit - passes validation and reaches authentication
      | password        | bytes | outcome                                                                        |
      | ascii(512)      | 512   | the request IS sent and answered with HTTP 401 {"error":"invalid credentials"} |
      | "é" x 256       | 512   | the request IS sent and answered with HTTP 401 {"error":"invalid credentials"} |

    Examples: Over the limit - blocked on the client
      | password        | bytes | outcome                                                                        |
      | ascii(513)      | 513   | no request is sent and the alert "Password must be at most 512 bytes" is shown |
      | "é" x 257       | 514   | no request is sent and the alert "Password must be at most 512 bytes" is shown |
      | ascii(511) + "é"| 513   | no request is sent and the alert "Password must be at most 512 bytes" is shown |

  @ui @boundary @CV-13
  Scenario Outline: Login username length boundary is 255 characters
    Given the visitor is on the "Login form"
    When they submit a username of <length> characters and a valid password
    Then <outcome>

    Examples:
      | length | outcome                                                                                  |
      | 31     | the request IS sent and answered with HTTP 401 (looser than the register cap of 30)      |
      | 255    | the request IS sent and answered with HTTP 401 {"error":"invalid credentials"}           |
      | 256    | no request is sent and the alert "Username must be at most 255 characters" is shown      |

  @ui @boundary @CV-14
  Scenario: Login accepts passwords between 73 and 512 bytes at the validation layer
    Given the visitor is on the "Login form"
    When they submit a unique username and a password of 100 ASCII characters
    Then the request IS sent and answered with HTTP 401 {"error":"invalid credentials"}
    # 100 bytes would be rejected on register (max 72) but is not a validation error on login

  @ui @negative @CV-15
  Scenario Outline: Login blocks missing required fields on the client
    Given the visitor is on the "Login form"
    When they submit username "<username>" and password "<password>"
    Then no request is sent
    And the alert "Username and password are required" is shown

    Examples:
      | username   | password  | note                       |
      |            |           | both empty                 |
      | <unique>   |           | password empty             |
      |            | <valid>   | username empty             |
      | <spaces>   | <valid>   | username whitespace only   |

  @ui @negative @CV-16
  Scenario Outline: Server-side rejections are displayed to the visitor in the alert
    Given the visitor is on the "<form>"
    When they submit <input>
    Then the alert "<message>" is shown

    Examples:
      | form              | input                                       | message                                   |
      | Login form        | a valid username and a wrong password       | invalid credentials                       |
      | Registration form | a unique username and a 7-character password | password must be at least 8 characters  |

  # =====================================================================
  # API - Registration (bypasses the UI)
  # =====================================================================

  Rule: API behavior - the backend enforces every limit independently of the frontend

  @api @boundary @CV-20
  Scenario Outline: POST /api/register username boundary
    When a client POSTs /api/register with a unique username of <length> characters and a valid password
    Then the response is <status> with body <body>

    Examples:
      | length | status | body                                                   |
      | 30     | 201    | {"message":"registration successful"}                  |
      | 31     | 400    | {"error":"username must be at most 30 characters"}     |

  @api @boundary @multibyte @CV-21
  Scenario Outline: POST /api/register password byte boundary
    When a client POSTs /api/register with a unique username and the password <password>
    Then the response is <status> with body <body>

    Examples:
      | password         | bytes | status | body                                                 |
      | ascii(72)        | 72    | 201    | {"message":"registration successful"}                |
      | ascii(73)        | 73    | 400    | {"error":"password must be at most 72 bytes"}        |
      | "é" x 36         | 72    | 201    | {"message":"registration successful"}                |
      | "é" x 37         | 74    | 400    | {"error":"password must be at most 72 bytes"}        |
      | "€" x 24         | 72    | 201    | {"message":"registration successful"}                |
      | "€" x 25         | 75    | 400    | {"error":"password must be at most 72 bytes"}        |
      | "😀" x 18        | 72    | 201    | {"message":"registration successful"}                |
      | "😀" x 19        | 76    | 400    | {"error":"password must be at most 72 bytes"}        |
      | ascii(70) + "é"  | 72    | 201    | {"message":"registration successful"}                |
      | ascii(71) + "é"  | 73    | 400    | {"error":"password must be at most 72 bytes"}        |

  @api @boundary @CV-22
  Scenario Outline: POST /api/register minimum password length
    When a client POSTs /api/register with a unique username and a password of <chars> ASCII characters
    Then the response is <status> with body <body>

    Examples:
      | chars | status | body                                                  |
      | 7     | 400    | {"error":"password must be at least 8 characters"}    |
      | 8     | 201    | {"message":"registration successful"}                 |

  @api @negative @CV-23
  Scenario Outline: POST /api/register rejects missing or malformed required fields
    When a client POSTs /api/register with the payload <payload>
    Then the response is 400 with body {"error":"username and password are required"}

    Examples:
      | payload                                    |
      | no body at all                             |
      | {}                                         |
      | username only                             |
      | password only                              |
      | empty username                             |
      | empty password                             |
      | whitespace-only username                   |
      | username is a number                       |
      | password is a number                       |
      | username is null                           |
      | password is null                           |

  @api @negative @CV-24
  Scenario Outline: POST /api/register reports the first failing rule (validation order)
    When a client POSTs /api/register with <case>
    Then the response is 400 with body {"error":"<message>"}

    Examples:
      | case                                                         | message                                     |
      | a 31-char username and an empty password                     | username and password are required          |
      | a 31-char username and a 7-char password                     | username must be at most 30 characters      |
      | a 31-char username and a 73-byte password                    | username must be at most 30 characters      |

  @api @negative @CV-25
  Scenario: A rejected registration does not create the account
    Given a client POSTs /api/register with a unique username and a 73-byte password and receives 400
    When the client POSTs /api/register with the same username and a valid password
    Then the response is 201 (not 409 "username already exists")
    And logging in with the valid password returns 200 with a token

  # =====================================================================
  # API - Login (bypasses the UI)
  # =====================================================================

  @api @happy-path @CV-30
  Scenario: POST /api/login with valid credentials returns a token
    Given an account exists
    When a client POSTs /api/login with that username and password
    Then the response is 200 with message "login successful" and a non-empty token

  @api @happy-path @multibyte @CV-31
  Scenario Outline: Accounts registered at the 72-byte cap can log in with the full password
    Given an account is registered with the password <password>
    When a client POSTs /api/login with that username and password
    Then the response is 200 with a non-empty token

    Examples:
      | password        |
      | ascii(72)       |
      | "é" x 36        |
      | "😀" x 18       |

  @api @negative @CV-32
  Scenario Outline: POST /api/login failures stay 401 with an identical body
    When a client POSTs /api/login for <account> with a wrong password
    Then the response is 401 with body {"error":"invalid credentials"}

    Examples:
      | account              |
      | an existing user     |
      | an unknown user      |

  @api @boundary @multibyte @CV-33
  Scenario Outline: POST /api/login password byte boundary
    When a client POSTs /api/login with a unique username and the password <password>
    Then the response is <status> with body <body>

    Examples:
      | password          | bytes | status | body                                                   |
      | ascii(100)        | 100   | 401    | {"error":"invalid credentials"}                        |
      | ascii(512)        | 512   | 401    | {"error":"invalid credentials"}                        |
      | ascii(513)        | 513   | 400    | {"error":"password must be at most 512 bytes"}         |
      | "é" x 256         | 512   | 401    | {"error":"invalid credentials"}                        |
      | "é" x 257         | 514   | 400    | {"error":"password must be at most 512 bytes"}         |
      | "€" x 170         | 510   | 401    | {"error":"invalid credentials"}                        |
      | "€" x 171         | 513   | 400    | {"error":"password must be at most 512 bytes"}         |
      | "😀" x 128        | 512   | 401    | {"error":"invalid credentials"}                        |
      | "😀" x 129        | 516   | 400    | {"error":"password must be at most 512 bytes"}         |
      | ascii(511) + "é"  | 513   | 400    | {"error":"password must be at most 512 bytes"}         |

  @api @boundary @CV-34
  Scenario Outline: POST /api/login username boundary
    When a client POSTs /api/login with a username of <length> characters and a valid password
    Then the response is <status> with body <body>

    Examples:
      | length | status | body                                                   |
      | 31     | 401    | {"error":"invalid credentials"}                        |
      | 255    | 401    | {"error":"invalid credentials"}                        |
      | 256    | 400    | {"error":"username must be at most 255 characters"}    |

  @api @negative @CV-35
  Scenario Outline: POST /api/login rejects missing or malformed required fields
    When a client POSTs /api/login with the payload <payload>
    Then the response is 400 with body {"error":"username and password are required"}

    Examples:
      | payload                    |
      | no body at all             |
      | {}                         |
      | username only              |
      | password only              |
      | empty username             |
      | empty password             |
      | whitespace-only username   |
      | username is a number       |
      | password is null           |

  @api @negative @CV-36
  Scenario: Login reports required-field errors before length errors
    When a client POSTs /api/login with a 256-char username and an empty password
    Then the response is 400 with body {"error":"username and password are required"}
