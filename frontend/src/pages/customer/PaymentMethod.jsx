import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import Loader from '../../components/Loader';
import './OrderForm.css';

const ORDER_DRAFT_KEY = 'yaminiflex_order_draft';

const readDraft = () => {
  try {
    const raw = sessionStorage.getItem(ORDER_DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const toFiniteNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const PaymentMethod = () => {
  const navigate = useNavigate();

  const draft = readDraft();

  const [paymentType, setPaymentType] = useState('online');
  const [onlineProvider, setOnlineProvider] =
    useState('PhonePe');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  /*
   * If the customer returns from PhonePe, these values
   * are available in the URL.
   */
  const queryParams = useMemo(() => {
    try {
      return new URLSearchParams(window.location.search);
    } catch {
      return new URLSearchParams();
    }
  }, []);

  if (!draft || !draft.designId) {
    return (
      <div className="page-container empty-state">
        No order draft found. Please start from the
        Customize & Order page.
      </div>
    );
  }

  const draftTotal = Math.max(
    0,
    toFiniteNumber(
      draft?.grandTotal,
      toFiniteNumber(draft?.totalAmount, 0)
    )
  );

  const quantity = Math.max(
    1,
    toFiniteNumber(draft?.quantity, 1)
  );

  const basePrice = Math.max(
    0,
    toFiniteNumber(draft?.designBasePrice, 0)
  );

  const amount = useMemo(
    () =>
      Math.max(
        draftTotal,
        quantity * basePrice
      ),
    [draftTotal, quantity, basePrice]
  );

  const buildFiles = () => {
    const files = [];

    if (draft.mainSubjectPhotoData) {
      const file = dataUrlToFile(
        draft.mainSubjectPhotoData,
        draft.mainPhotoName ||
          'main-subject-photo'
      );

      if (file) {
        files.push(file);
      }
    }

    if (Array.isArray(draft.additionalFilesData)) {
      draft.additionalFilesData.forEach(
        (data, index) => {
          if (!data) return;

          const file = dataUrlToFile(
            data,
            draft.additionalFilesNames?.[index] ||
              `additional-photo-${index + 1}`
          );

          if (file) {
            files.push(file);
          }
        }
      );
    }

    return files;
  };

  /**
   * Creates the normal Yamini Flex order first.
   *
   * For PhonePe:
   * paymentStatus = Pending
   * amountPaid = 0
   *
   * We then call the PhonePe backend endpoint.
   */
  const createPendingOrder = async () => {
    const formData = new FormData();

    const cleanDraft = {
      ...draft,
    };

    delete cleanDraft.mainSubjectPhotoData;
    delete cleanDraft.additionalFilesData;
    delete cleanDraft.additionalFilesNames;
    delete cleanDraft.mainPhotoName;

    Object.entries(cleanDraft).forEach(
      ([key, value]) => {
        if (
          value === undefined ||
          value === null ||
          value === ''
        ) {
          return;
        }

        if (Array.isArray(value)) {
          value.forEach((item) => {
            formData.append(
              key,
              String(item)
            );
          });
        } else {
          formData.append(
            key,
            String(value)
          );
        }
      }
    );

    const files = buildFiles();

    files.forEach((file) => {
      formData.append(
        'customerFiles',
        file
      );
    });

    const validAmount = Math.round(
      Math.max(0, amount)
    );

    if (paymentType === 'cod') {
      formData.set(
        'paymentMethod',
        'COD'
      );

      formData.set(
        'paymentStatus',
        'COD / Pending'
      );

      formData.set(
        'transactionId',
        ''
      );

      formData.set(
        'amountPaid',
        '0'
      );
    } else {
      formData.set(
        'paymentMethod',
        onlineProvider
      );

      /*
       * NEVER mark online payment as Paid here.
       */
      formData.set(
        'paymentStatus',
        'Pending'
      );

      formData.set(
        'transactionId',
        ''
      );

      formData.set(
        'amountPaid',
        '0'
      );
    }

    formData.set(
      'totalAmount',
      String(validAmount)
    );

    formData.set(
      'grandTotal',
      String(validAmount)
    );

    formData.set(
      'paymentDate',
      new Date()
        .toISOString()
        .slice(0, 10)
    );

    formData.set(
      'paymentTime',
      new Date().toLocaleTimeString()
    );

    formData.set(
      'status',
      'Order Placed'
    );

    const response = await api.post(
      '/orders',
      formData
    );

    return (
      response.data?.data ||
      response.data
    );
  };

  /**
   * Start PhonePe payment.
   */
  const handlePhonePePayment = async () => {
    setLoading(true);
    setError('');
    setStatus('');

    try {
      /*
       * Step 1:
       * Create Yamini Flex order as Pending.
       */
      const order =
        await createPendingOrder();

      const orderId =
        order?._id ||
        order?.id;

      if (!orderId) {
        throw new Error(
          'Order was created but no order ID was returned.'
        );
      }

      /*
       * Step 2:
       * Ask our backend to create the PhonePe
       * Standard Checkout payment.
       */
      setStatus(
        'Connecting to PhonePe...'
      );

      const paymentResponse =
        await api.post(
          '/payments/phonepe/create',
          {
            orderId,
          }
        );

      const paymentData =
        paymentResponse.data?.data ||
        paymentResponse.data;

      const redirectUrl =
        paymentData?.redirectUrl;

      if (!redirectUrl) {
        throw new Error(
          'PhonePe did not return a payment URL.'
        );
      }

      /*
       * Step 3:
       * Save the order ID temporarily so that
       * the callback page can identify the order.
       */
      sessionStorage.setItem(
        'yaminiflex_phonepe_order',
        JSON.stringify({
          orderId,
          merchantOrderId:
            paymentData?.merchantOrderId || '',
        })
      );

      /*
       * Step 4:
       * Redirect to PhonePe hosted checkout.
       */
      window.location.href =
        redirectUrl;
    } catch (err) {
      console.error(
        'PhonePe payment error:',
        err
      );

      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Unable to start PhonePe payment.'
      );

      setStatus('');
    } finally {
      setLoading(false);
    }
  };

  /**
   * COD order.
   */
  const handleCODPayment = async () => {
    setLoading(true);
    setError('');
    setStatus('');

    try {
      const order =
        await createPendingOrder();

      const orderId =
        order?._id ||
        order?.id ||
        order?.orderId;

      if (!orderId) {
        throw new Error(
          'Order was created but no order ID was returned.'
        );
      }

      sessionStorage.removeItem(
        ORDER_DRAFT_KEY
      );

      navigate(
        `/order-success/${orderId}`
      );
    } catch (err) {
      console.error(
        'COD order error:',
        err
      );

      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Unable to place order.'
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * Called by the PhonePe callback page if
   * you choose to route back to this same component.
   *
   * This function asks the backend to verify
   * the payment directly with PhonePe.
   */
  const verifyReturnedPhonePePayment =
    async () => {
      const callbackOrderId =
        queryParams.get('orderId');

      const merchantOrderId =
        queryParams.get(
          'merchantOrderId'
        );

      if (
        !callbackOrderId ||
        !merchantOrderId
      ) {
        return;
      }

      setLoading(true);
      setError('');
      setStatus(
        'Verifying your PhonePe payment...'
      );

      try {
        const response =
          await api.post(
            '/payments/phonepe/verify',
            {
              orderId:
                callbackOrderId,
              merchantOrderId,
            }
          );

        const data =
          response.data?.data ||
          response.data;

        if (
          response.data?.paid === true
        ) {
          sessionStorage.removeItem(
            ORDER_DRAFT_KEY
          );

          sessionStorage.removeItem(
            'yaminiflex_phonepe_order'
          );

          navigate(
            `/order-success/${
              data?._id ||
              callbackOrderId
            }`
          );

          return;
        }

        if (
          response.data?.status ===
          'FAILED'
        ) {
          setError(
            'PhonePe payment failed. Please try again.'
          );
          setStatus('');
          return;
        }

        setStatus(
          'Payment is still pending. Please wait a moment and try verification again.'
        );
      } catch (err) {
        console.error(
          'PhonePe verification error:',
          err
        );

        setError(
          err?.response?.data?.message ||
            err?.message ||
            'Unable to verify PhonePe payment.'
        );

        setStatus('');
      } finally {
        setLoading(false);
      }
    };

  /*
   * If this page is opened with PhonePe callback
   * parameters, verify the payment.
   */
  if (
    queryParams.get('orderId') &&
    queryParams.get('merchantOrderId') &&
    !loading &&
    !status &&
    !error
  ) {
    /*
     * Avoid running during render.
     * A simple asynchronous queue lets the page
     * begin verification after rendering.
     */
    Promise.resolve().then(
      verifyReturnedPhonePePayment
    );
  }

  const handleConfirm = async () => {
    if (
      !draft ||
      !draft.designId
    ) {
      setError(
        'No order draft was found. Please start again.'
      );
      return;
    }

    if (paymentType === 'cod') {
      await handleCODPayment();
      return;
    }

    if (onlineProvider === 'PhonePe') {
      await handlePhonePePayment();
      return;
    }

    setError(
      'Currently, PhonePe is the available online payment gateway.'
    );
  };

  return (
    <div className="page-container order-form-page payment-method-page">
      <div className="payment-method-frame">
        <div className="payment-method-head">
          <div>
            <h1 className="section-title">
              Choose Payment Method
            </h1>
          </div>

          <span className="secure-badge">
            Secure Checkout
          </span>
        </div>

        <div className="payment-method-tabs">
          <label className="payment-option">
            <input
              type="radio"
              checked={
                paymentType === 'online'
              }
              onChange={() => {
                setPaymentType('online');
                setError('');
                setStatus('');
              }}
            />

            <span className="payment-tab-title">
              Online Payment
            </span>
          </label>

          <label className="payment-option">
            <input
              type="radio"
              checked={
                paymentType === 'cod'
              }
              onChange={() => {
                setPaymentType('cod');
                setError('');
                setStatus('');
              }}
            />

            <span className="payment-tab-title">
              Cash on Delivery (COD)
            </span>
          </label>
        </div>

        <div className="payment-grid">
          <section className="payment-method-panel">
            {paymentType === 'online' && (
              <div className="online-gateways">
                <div className="gateway-heading">
                  <h3>
                    Online Payment Options
                  </h3>
                </div>

                <div className="gateway-list">
                  <label className="gateway-row">
                    <input
                      type="radio"
                      name="gateway"
                      checked={
                        onlineProvider ===
                        'PhonePe'
                      }
                      onChange={() => {
                        setOnlineProvider(
                          'PhonePe'
                        );
                        setError('');
                        setStatus('');
                      }}
                    />

                    <span>
                      PhonePe
                    </span>
                  </label>
                </div>

                <div className="phonepe-scan-card">
                  <div className="phonepe-scan-top">
                    <span className="phonepe-brand">
                      PhonePe
                    </span>

                    <span className="phonepe-status">
                      Secure Online Payment
                    </span>
                  </div>

                  <div className="phonepe-scan-body">
                    <div className="phonepe-scan-details">
                      <div className="scan-detail-row">
                        <span className="scan-label">
                          Paying Amount
                        </span>

                        <span className="scan-value">
                          ₹{amount}
                        </span>
                      </div>

                      <div className="scan-detail-row">
                        <span className="scan-label">
                          Merchant
                        </span>

                        <span className="scan-value">
                          YAMINI FLEX PRINTING
                        </span>
                      </div>

                      <div className="scan-detail-row">
                        <span className="scan-label">
                          Payment
                        </span>

                        <span className="scan-value">
                          PhonePe Secure Checkout
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="scan-helper">
                    Click "Confirm Payment &
                    Place Order" to continue to
                    PhonePe's secure payment page.
                  </p>
                </div>
              </div>
            )}

            {paymentType === 'cod' && (
              <div className="cod-payment">
                <h3>
                  Cash on Delivery
                </h3>

                <div className="cod-payment-body">
                  <p>
                    <strong>
                      Final amount:
                    </strong>{' '}
                    ₹{amount}
                  </p>

                  <p>
                    Payment status will remain{' '}
                    <strong>
                      Pending
                    </strong>{' '}
                    until cash is received.
                  </p>
                </div>
              </div>
            )}
          </section>

          <aside className="order-summary-panel">
            <h3>
              Order Summary
            </h3>

            <div className="summary-line">
              <span>
                Design
              </span>

              <span>
                {draft.designTitle ||
                  draft.designId}
              </span>
            </div>

            <div className="summary-line">
              <span>
                Size
              </span>

              <span>
                {draft.size}
              </span>
            </div>

            <div className="summary-line">
              <span>
                Quantity
              </span>

              <span>
                {draft.quantity}
              </span>
            </div>

            <div className="summary-line">
              <span>
                Material
              </span>

              <span>
                {draft.material}
              </span>
            </div>

            <div className="summary-line total-line">
              <span>
                Grand Total
              </span>

              <span>
                ₹{amount}
              </span>
            </div>

            {error && (
              <p className="order-form-error">
                {error}
              </p>
            )}

            {status && (
              <p className="order-status-message">
                {status}
              </p>
            )}

            <button
              type="button"
              className="btn btn-primary"
              onClick={handleConfirm}
              disabled={loading}
            >
              {loading ? (
                <Loader label="" />
              ) : paymentType ===
                'cod' ? (
                'Confirm Order'
              ) : (
                'Pay with PhonePe'
              )}
            </button>
          </aside>
        </div>
      </div>
    </div>
  );
};

function dataUrlToFile(
  dataUrl,
  fileName
) {
  if (!dataUrl) {
    return null;
  }

  try {
    const [meta, data] =
      dataUrl.split(',');

    if (!data) {
      return null;
    }

    const mime =
      meta?.match(
        /:(.*?);/
      )?.[1] ||
      'application/octet-stream';

    const binary =
      atob(data);

    const array =
      new Uint8Array(
        binary.length
      );

    for (
      let i = 0;
      i < binary.length;
      i += 1
    ) {
      array[i] =
        binary.charCodeAt(i);
    }

    return new File(
      [array],
      fileName,
      {
        type: mime,
      }
    );
  } catch {
    return null;
  }
}

export default PaymentMethod;