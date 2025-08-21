;; Invoice Management Contract
;; Clarity v2
;; Manages creation, verification, and tracking of trade invoices on-chain for TradeFin

;; Error codes
(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-INVALID-INVOICE u101)
(define-constant ERR-INVOICE-EXISTS u102)
(define-constant ERR-INVOICE-NOT-FOUND u103)
(define-constant ERR-PAUSED u104)
(define-constant ERR-ZERO-ADDRESS u105)
(define-constant ERR-INVALID-STATUS u106)
(define-constant ERR-ALREADY-VERIFIED u107)
(define-constant ERR-ORACLE-FAILURE u108)

;; Invoice status codes
(define-constant STATUS-PENDING u0)
(define-constant STATUS-APPROVED u1)
(define-constant STATUS-PAID u2)
(define-constant STATUS-DISPUTED u3)
(define-constant STATUS-CANCELLED u4)

;; Admin and contract state
(define-data-var admin principal tx-sender)
(define-data-var paused bool false)
(define-data-var oracle principal 'SP000000000000000000002Q6VF78) ;; Placeholder oracle address
(define-data-var invoice-counter uint u0)

;; Invoice data structure
(define-map invoices
  { invoice-id: uint }
  {
    issuer: principal,
    recipient: principal,
    amount: uint,
    currency: (string-ascii 3), ;; e.g., "USD", "EUR"
    issue-date: uint, ;; Block height
    due-date: uint,   ;; Block height
    status: uint,
    verified: bool,
    description: (string-ascii 256)
  }
)

;; Map for tracking invoice hashes to prevent duplicates
(define-map invoice-hashes (buff 32) uint)

;; Private helper: is-admin
(define-private (is-admin)
  (is-eq tx-sender (var-get admin))
)

;; Private helper: ensure not paused
(define-private (ensure-not-paused)
  (asserts! (not (var-get paused)) (err ERR-PAUSED))
)

;; Private helper: is-valid-status
(define-private (is-valid-status (status uint))
  (or (is-eq status STATUS-PENDING)
      (is-eq status STATUS-APPROVED)
      (is-eq status STATUS-PAID)
      (is-eq status STATUS-DISPUTED)
      (is-eq status STATUS-CANCELLED))
)

;; Transfer admin rights
(define-public (transfer-admin (new-admin principal))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (asserts! (not (is-eq new-admin 'SP000000000000000000002Q6VF78)) (err ERR-ZERO-ADDRESS))
    (var-set admin new-admin)
    (ok true)
  )
)

;; Set oracle address
(define-public (set-oracle (new-oracle principal))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (asserts! (not (is-eq new-oracle 'SP000000000000000000002Q6VF78)) (err ERR-ZERO-ADDRESS))
    (var-set oracle new-oracle)
    (ok true)
  )
)

;; Pause/unpause the contract
(define-public (set-paused (pause bool))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (var-set paused pause)
    (ok pause)
  )
)

;; Create a new invoice
(define-public (create-invoice
  (recipient principal)
  (amount uint)
  (currency (string-ascii 3))
  (due-date uint)
  (description (string-ascii 256))
  (invoice-hash (buff 32)))
  (begin
    (ensure-not-paused)
    (asserts! (not (is-eq recipient 'SP000000000000000000002Q6VF78)) (err ERR-ZERO-ADDRESS))
    (asserts! (> amount u0) (err ERR-INVALID-INVOICE))
    (asserts! (> due-date block-height) (err ERR-INVALID-INVOICE))
    (asserts! (is-none (map-get? invoice-hashes invoice-hash)) (err ERR-INVOICE-EXISTS))
    (let ((invoice-id (+ (var-get invoice-counter) u1)))
      (map-set invoices
        { invoice-id: invoice-id }
        {
          issuer: tx-sender,
          recipient: recipient,
          amount: amount,
          currency: currency,
          issue-date: block-height,
          due-date: due-date,
          status: STATUS-PENDING,
          verified: false,
          description: description
        }
      )
      (map-set invoice-hashes invoice-hash invoice-id)
      (var-set invoice-counter invoice-id)
      (ok invoice-id)
    )
  )
)

;; Update invoice status
(define-public (update-status (invoice-id uint) (new-status uint))
  (begin
    (ensure-not-paused)
    (asserts! (is-valid-status new-status) (err ERR-INVALID-STATUS))
    (match (map-get? invoices { invoice-id: invoice-id })
      invoice
      (begin
        (asserts! (is-eq tx-sender (get issuer invoice)) (err ERR-NOT-AUTHORIZED))
        (map-set invoices
          { invoice-id: invoice-id }
          (merge invoice { status: new-status }))
        (ok true)
      )
      (err ERR-INVOICE-NOT-FOUND)
    )
  )
)

;; Verify invoice via oracle
(define-public (verify-invoice (invoice-id uint))
  (begin
    (ensure-not-paused)
    (asserts! (is-eq tx-sender (var-get oracle)) (err ERR-NOT-AUTHORIZED))
    (match (map-get? invoices { invoice-id: invoice-id })
      invoice
      (begin
        (asserts! (not (get verified invoice)) (err ERR-ALREADY-VERIFIED))
        (map-set invoices
          { invoice-id: invoice-id }
          (merge invoice { verified: true }))
        (ok true)
      )
      (err ERR-INVOICE-NOT-FOUND)
    )
  )
)

;; Cancel invoice
(define-public (cancel-invoice (invoice-id uint))
  (begin
    (ensure-not-paused)
    (match (map-get? invoices { invoice-id: invoice-id })
      invoice
      (begin
        (asserts! (is-eq tx-sender (get issuer invoice)) (err ERR-NOT-AUTHORIZED))
        (asserts! (is-eq (get status invoice) STATUS-PENDING) (err ERR-INVALID-STATUS))
        (map-set invoices
          { invoice-id: invoice-id }
          (merge invoice { status: STATUS-CANCELLED }))
        (ok true)
      )
      (err ERR-INVOICE-NOT-FOUND)
    )
  )
)

;; Read-only: get invoice details
(define-read-only (get-invoice (invoice-id uint))
  (match (map-get? invoices { invoice-id: invoice-id })
    invoice (ok invoice)
    (err ERR-INVOICE-NOT-FOUND)
  )
)

;; Read-only: get invoice count
(define-read-only (get-invoice-count)
  (ok (var-get invoice-counter))
)

;; Read-only: get admin
(define-read-only (get-admin)
  (ok (var-get admin))
)

;; Read-only: get oracle
(define-read-only (get-oracle)
  (ok (var-get oracle))
)

;; Read-only: check if paused
(define-read-only (is-paused)
  (ok (var-get paused))
)

;; Read-only: get invoice ID by hash
(define-read-only (get-invoice-by-hash (invoice-hash (buff 32)))
  (match (map-get? invoice-hashes invoice-hash)
    invoice-id (ok invoice-id)
    (err ERR-INVOICE-NOT-FOUND)
  )
)