import React from 'react';
import { Link } from 'react-router-dom';
import './HowIt.css';
import {
  FaPalette,
  FaShoppingCart,
  FaPaintBrush,
  FaFilePdf,
  FaEye,
  FaCheckCircle,
  FaPrint,
  FaTruck,
  FaArrowRight,
  FaClock,
  FaMapMarkerAlt,
  FaUndo,
} from 'react-icons/fa';

const steps = [
  {
    number: '01',
    icon: <FaPalette />,
    title: 'Choose Your Design',
    description:
      'Browse our collection of flex designs and select the design that best matches your event, celebration, business, or personal requirement.',
    status: 'Design Selected',
  },
  {
    number: '02',
    icon: <FaShoppingCart />,
    title: 'Place Your Order',
    description:
      'Enter your required size, quantity, customization details, contact information, and delivery address to place your order.',
    status: 'Order Placed',
  },
  {
    number: '03',
    icon: <FaPaintBrush />,
    title: 'Design Preparation',
    description:
      'Our team reviews your requirements and prepares the customized flex design according to the details you provided.',
    status: 'In Progress',
  },
  {
    number: '04',
    icon: <FaFilePdf />,
    title: 'Final Design Uploaded',
    description:
      'Once your design is prepared, our team uploads the final design file for you to review before printing.',
    status: 'Awaiting Approval',
  },
  {
    number: '05',
    icon: <FaEye />,
    title: 'Review & Approve',
    description:
      'View the final design carefully. If everything looks correct, approve it. If changes are required, you can request modifications.',
    status: 'Customer Review',
  },
  {
    number: '06',
    icon: <FaPrint />,
    title: 'Printing',
    description:
      'After your approval, the final design is sent for printing using the selected material and required specifications.',
    status: 'Printing',
  },
  {
    number: '07',
    icon: <FaCheckCircle />,
    title: 'Ready',
    description:
      'Your completed flex is checked and prepared for either delivery to your address or pickup from the studio.',
    status: 'Ready',
  },
  {
    number: '08',
    icon: <FaTruck />,
    title: 'Delivery / Pickup',
    description:
      'Your finished flex is delivered to the provided address or made available for pickup, completing your order.',
    status: 'Delivered',
  },
];

const statusFlow = [
  'pending',
  'confirmed',
  'in-progress',
  'awaiting-approval',
  'approved',
  'ready',
  'delivered',
];

const HowIt = () => {
  return (
    <div
      className="how-it-works-page"
      style={{
        minHeight: '100vh',
        background: '#F7F9FC',
        color: '#172033',
        fontFamily:
          'Inter, Arial, Helvetica, sans-serif',
        overflow: 'hidden',
      }}
    >
      {/* =========================================================
          HERO SECTION
      ========================================================= */}
      <section
        className="how-it-works-intro"
        style={{
          background:
            'linear-gradient(135deg, #062A63 0%, #0B3D91 55%, #1456B8 100%)',
          padding: '92px 20px 105px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative circles */}
        <div
          style={{
            position: 'absolute',
            width: '360px',
            height: '360px',
            borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.10)',
            top: '-180px',
            right: '-90px',
          }}
        />

        <div
          style={{
            position: 'absolute',
            width: '520px',
            height: '520px',
            borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.07)',
            bottom: '-350px',
            left: '-220px',
          }}
        />

        <div
          style={{
            position: 'absolute',
            width: '180px',
            height: '180px',
            borderRadius: '50%',
            background: 'rgba(244,196,48,0.08)',
            top: '18%',
            left: '8%',
            filter: 'blur(2px)',
          }}
        />

        {/* Yellow decorative line */}
        <div
          style={{
            position: 'absolute',
            width: '90px',
            height: '4px',
            borderRadius: '10px',
            background: '#F4C430',
            top: '46%',
            right: '7%',
            transform: 'rotate(-45deg)',
            opacity: 0.75,
          }}
        />

        <div
          style={{
            maxWidth: '1000px',
            margin: '0 auto',
            textAlign: 'center',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '9px',
              padding: '9px 19px',
              borderRadius: '30px',
              border:
                '1px solid rgba(244,196,48,0.55)',
              background:
                'rgba(244,196,48,0.10)',
              color: '#FFD95A',
              fontSize: '12px',
              fontWeight: '800',
              letterSpacing: '1.7px',
              textTransform: 'uppercase',
              marginBottom: '24px',
              boxShadow:
                '0 8px 25px rgba(0,0,0,0.10)',
            }}
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: '#F4C430',
                boxShadow:
                  '0 0 0 5px rgba(244,196,48,0.12)',
              }}
            />
            Simple. Transparent. Reliable.
          </div>

          <h1
            style={{
              margin: '0 0 22px',
              color: '#FFFFFF',
              fontFamily:
                'Georgia, "Times New Roman", serif',
              fontSize:
                'clamp(40px, 6vw, 70px)',
              lineHeight: 1.08,
              fontWeight: '600',
              letterSpacing: '-1.5px',
            }}
          >
            How It Works
            <span
              style={{
                display: 'block',
                width: '72px',
                height: '4px',
                background: '#F4C430',
                borderRadius: '10px',
                margin: '22px auto 0',
              }}
            />
          </h1>

          <p
            style={{
              maxWidth: '760px',
              margin: '0 auto',
              color: 'rgba(255,255,255,0.86)',
              fontSize:
                'clamp(16px, 2vw, 19px)',
              lineHeight: 1.8,
            }}
          >
            From choosing your design to receiving your
            finished flex, we make the entire printing
            process simple and transparent.
          </p>
        </div>
      </section>

      {/* =========================================================
          INTRODUCTION
      ========================================================= */}
      <section
        className="how-it-works-process"
        style={{
          padding: '78px 20px 42px',
          background: '#FFFFFF',
        }}
      >
        <div
          style={{
            maxWidth: '950px',
            margin: '0 auto',
            textAlign: 'center',
          }}
        >
          <span
            style={{
              display: 'inline-block',
              color: '#D39E00',
              fontSize: '12px',
              fontWeight: '800',
              letterSpacing: '1.8px',
              textTransform: 'uppercase',
              marginBottom: '4px',
            }}
          >
            Your Order Journey
          </span>

          <h2
            style={{
              margin: '12px 0 18px',
              fontFamily:
                'Georgia, "Times New Roman", serif',
              color: '#0B3D91',
              fontSize:
                'clamp(29px, 4vw, 43px)',
              fontWeight: '600',
              letterSpacing: '-0.5px',
            }}
          >
            From Idea to Finished Flex
          </h2>

          <div
            style={{
              width: '55px',
              height: '4px',
              background: '#F4C430',
              borderRadius: '10px',
              margin: '0 auto 22px',
            }}
          />

          <p
            style={{
              margin: '0 auto',
              maxWidth: '780px',
              color: '#667085',
              lineHeight: 1.85,
              fontSize: '16px',
            }}
          >
            Every order follows a clear process. You
            provide your requirements, our team prepares
            the design, you review and approve it, and
            only then do we move forward with printing.
          </p>
        </div>
      </section>

      {/* =========================================================
          PROCESS STEPS
      ========================================================= */}
      <section
        style={{
          padding: '42px 20px 95px',
          background: '#FFFFFF',
        }}
      >
        <div
          style={{
            maxWidth: '1120px',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '25px',
          }}
        >
          {steps.map((step, index) => (
            <div
              key={step.number}
              className="how-it-works-step-card"
              style={{
                background: '#FFFFFF',
                border: '1px solid #E1E8F2',
                borderRadius: '20px',
                padding: '31px 27px',
                position: 'relative',
                overflow: 'hidden',
                boxShadow:
                  '0 10px 35px rgba(11,61,145,0.07)',
                transition:
                  'transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform =
                  'translateY(-7px)';
                e.currentTarget.style.boxShadow =
                  '0 20px 45px rgba(11,61,145,0.14)';
                e.currentTarget.style.borderColor =
                  '#BFD2EE';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform =
                  'translateY(0)';
                e.currentTarget.style.boxShadow =
                  '0 10px 35px rgba(11,61,145,0.07)';
                e.currentTarget.style.borderColor =
                  '#E1E8F2';
              }}
            >
              {/* Top accent */}
              <div
                className="how-it-works-step-number"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  background:
                    'linear-gradient(90deg, #0B3D91, #F4C430)',
                }}
              />

              {/* Number */}
              <div
                className="how-it-works-step-icon"
                style={{
                  position: 'absolute',
                  top: '20px',
                  right: '22px',
                  color: '#E6EDF7',
                  fontSize: '31px',
                  fontWeight: '800',
                  lineHeight: 1,
                }}
              >
                {step.number}
              </div>

              {/* Icon */}
              <div
                className="how-it-works-step-status"
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '17px',
                  background:
                    'linear-gradient(145deg, #EEF5FF, #E4EEFC)',
                  color: '#0B3D91',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '23px',
                  marginBottom: '23px',
                  border:
                    '1px solid #D8E5F7',
                  boxShadow:
                    '0 8px 18px rgba(11,61,145,0.08)',
                }}
              >
                {step.icon}
              </div>

              <h3
                style={{
                  margin: '0 0 12px',
                  color: '#0B3D91',
                  fontFamily:
                    'Georgia, "Times New Roman", serif',
                  fontSize: '23px',
                  fontWeight: '600',
                  lineHeight: 1.25,
                  paddingRight: '35px',
                }}
              >
                {step.title}
              </h3>

              <p
                style={{
                  margin: '0 0 21px',
                  color: '#667085',
                  fontSize: '14px',
                  lineHeight: 1.8,
                }}
              >
                {step.description}
              </p>

              {/* Status */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '7px',
                  padding: '8px 13px',
                  borderRadius: '20px',
                  background: '#FFF8DC',
                  border:
                    '1px solid #F7E7A7',
                  color: '#9A7200',
                  fontSize: '12px',
                  fontWeight: '800',
                }}
              >
                <FaClock size={11} />
                {step.status}
              </div>

              {/* Connector intentionally hidden on desktop
                  to preserve existing mechanism/layout */}
              {index < steps.length - 1 && (
                <div
                  style={{
                    display: 'none',
                  }}
                >
                  <FaArrowRight />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* =========================================================
          CUSTOMER APPROVAL SECTION
      ========================================================= */}
      <section
        className="how-it-works-approval"
        style={{
          background:
            'linear-gradient(135deg, #EEF5FF 0%, #F7FAFF 100%)',
          padding: '82px 20px',
          borderTop:
            '1px solid #E0E9F5',
          borderBottom:
            '1px solid #E0E9F5',
        }}
      >
        <div
          style={{
            maxWidth: '1050px',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '48px',
            alignItems: 'center',
          }}
        >
          <div>
            <span
              style={{
                display: 'inline-block',
                color: '#D39E00',
                fontSize: '12px',
                fontWeight: '800',
                letterSpacing: '1.7px',
                textTransform: 'uppercase',
                marginBottom: '4px',
              }}
            >
              Your Approval Matters
            </span>

            <h2
              style={{
                margin: '12px 0 18px',
                color: '#0B3D91',
                fontFamily:
                  'Georgia, "Times New Roman", serif',
                fontSize:
                  'clamp(29px, 4vw, 41px)',
                lineHeight: 1.2,
                fontWeight: '600',
              }}
            >
              You See It Before We Print It
            </h2>

            <div
              style={{
                width: '55px',
                height: '4px',
                background: '#F4C430',
                borderRadius: '10px',
                marginBottom: '22px',
              }}
            />

            <p
              style={{
                margin: 0,
                color: '#667085',
                lineHeight: 1.85,
                fontSize: '15px',
                maxWidth: '560px',
              }}
            >
              Before your flex goes into production, our
              team uploads the final design for your review.
              You can check the design and approve it before
              printing begins.
            </p>
          </div>

          {/* Approval Card */}
          <div
            className="how-it-works-approval-card"
            style={{
              background: '#FFFFFF',
              borderRadius: '22px',
              padding: '31px',
              boxShadow:
                '0 18px 45px rgba(11,61,145,0.12)',
              border:
                '1px solid #DCE6F4',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Card top accent */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '5px',
                background:
                  'linear-gradient(90deg, #0B3D91, #F4C430)',
              }}
            />

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '23px',
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: '11px',
                    color: '#8A94A6',
                    fontWeight: '700',
                    letterSpacing: '1px',
                    marginBottom: '6px',
                  }}
                >
                  ORDER STATUS
                </div>

                <strong
                  style={{
                    color: '#0B3D91',
                    fontSize: '18px',
                  }}
                >
                  Awaiting Approval
                </strong>
              </div>

              <div
                className="how-it-works-approval-icon"
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: '#EEF5FF',
                  color: '#0B3D91',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border:
                    '1px solid #D9E6F7',
                  boxShadow:
                    '0 7px 17px rgba(11,61,145,0.08)',
                }}
              >
                <FaEye />
              </div>
            </div>

            <div
              className="how-it-works-approval-file"
              style={{
                border:
                  '1px solid #E0E7F0',
                borderRadius: '14px',
                padding: '21px',
                background: '#F9FBFE',
                marginBottom: '19px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '13px',
                }}
              >
                <div
                  className="how-it-works-approval-file-icon"
                  style={{
                    width: '43px',
                    height: '43px',
                    borderRadius: '11px',
                    background: '#FFF7D6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <FaFilePdf
                    style={{
                      color: '#C99500',
                      fontSize: '23px',
                    }}
                  />
                </div>

                <div>
                  <strong
                    style={{
                      display: 'block',
                      color: '#172033',
                      marginBottom: '3px',
                    }}
                  >
                    Final Design
                  </strong>

                  <span
                    style={{
                      color: '#8A94A6',
                      fontSize: '12px',
                    }}
                  >
                    Your customized design
                  </span>
                </div>
              </div>

              <div
                style={{
                  height: '8px',
                  background: '#E6ECF3',
                  borderRadius: '10px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    background:
                      'linear-gradient(90deg, #0B3D91, #F4C430)',
                    borderRadius: '10px',
                  }}
                />
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                gap: '10px',
                flexWrap: 'wrap',
              }}
            >
              <button
                type="button"
                className="how-it-works-approval-button"
                style={{
                  flex: 1,
                  minWidth: '120px',
                  border: 'none',
                  borderRadius: '11px',
                  padding: '13px 16px',
                  background:
                    'linear-gradient(135deg, #0B3D91, #1456B8)',
                  color: '#FFFFFF',
                  fontWeight: '800',
                  cursor: 'default',
                  boxShadow:
                    '0 8px 18px rgba(11,61,145,0.18)',
                }}
              >
                <FaCheckCircle
                  style={{
                    marginRight: '7px',
                  }}
                />
                Approve
              </button>

              <button
                type="button"
                className="how-it-works-approval-button-secondary"
                style={{
                  flex: 1,
                  minWidth: '120px',
                  border:
                    '1px solid #D6DFEB',
                  borderRadius: '11px',
                  padding: '13px 16px',
                  background: '#FFFFFF',
                  color: '#344054',
                  fontWeight: '800',
                  cursor: 'default',
                }}
              >
                <FaUndo
                  style={{
                    marginRight: '7px',
                  }}
                />
                Request Changes
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          ORDER STATUS FLOW
      ========================================================= */}
      <section
        className="how-it-works-status"
        style={{
          padding: '84px 20px',
          background: '#FFFFFF',
        }}
      >
        <div
          style={{
            maxWidth: '1050px',
            margin: '0 auto',
            textAlign: 'center',
          }}
        >
          <span
            style={{
              display: 'inline-block',
              color: '#D39E00',
              fontSize: '12px',
              fontWeight: '800',
              letterSpacing: '1.7px',
              textTransform: 'uppercase',
            }}
          >
            Order Tracking
          </span>

          <h2
            style={{
              margin: '12px 0 14px',
              color: '#0B3D91',
              fontFamily:
                'Georgia, "Times New Roman", serif',
              fontSize:
                'clamp(29px, 4vw, 41px)',
              fontWeight: '600',
            }}
          >
            Follow Your Order
          </h2>

          <div
            style={{
              width: '55px',
              height: '4px',
              background: '#F4C430',
              borderRadius: '10px',
              margin: '0 auto 45px',
            }}
          />

          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'center',
              gap: '0',
              overflowX: 'auto',
              padding: '10px 5px 25px',
            }}
          >
            {statusFlow.map((status, index) => (
              <React.Fragment key={status}>
                <div
                  className="how-it-works-status-node"
                  style={{
                    minWidth: '110px',
                    textAlign: 'center',
                  }}
                >
                  <div
                    className={`how-it-works-status-dot${index === 0 ? ' is-active' : ''}`}
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      background:
                        index === 0
                          ? '#0B3D91'
                          : '#EEF5FF',
                      color:
                        index === 0
                          ? '#FFFFFF'
                          : '#0B3D91',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 11px',
                      fontWeight: '800',
                      border:
                        index === 0
                          ? '2px solid #0B3D91'
                          : '2px solid #D5E2F4',
                      boxShadow:
                        index === 0
                          ? '0 8px 20px rgba(11,61,145,0.22)'
                          : 'none',
                    }}
                  >
                    {index + 1}
                  </div>

                  <span
                    className="how-it-works-status-label"
                    style={{
                      color: '#526071',
                      fontSize: '11px',
                      fontWeight: '700',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {status
                      .replace(/-/g, ' ')
                      .replace(/\b\w/g, (c) =>
                        c.toUpperCase()
                      )}
                  </span>
                </div>

                {index <
                  statusFlow.length - 1 && (
                  <div
                    className="how-it-works-status-connector"
                    style={{
                      width: '55px',
                      height: '3px',
                      background:
                        'linear-gradient(90deg, #BFD0E7, #E4EAF2)',
                      marginTop: '21px',
                      flexShrink: 0,
                      borderRadius: '10px',
                    }}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================
          DELIVERY SECTION
      ========================================================= */}
      <section
        className="how-it-works-delivery"
        style={{
          padding: '82px 20px',
          background:
            'linear-gradient(135deg, #062A63 0%, #0B3D91 60%, #1456B8 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative circle */}
        <div
          style={{
            position: 'absolute',
            width: '360px',
            height: '360px',
            borderRadius: '50%',
            border:
              '1px solid rgba(255,255,255,0.09)',
            right: '-160px',
            top: '-170px',
          }}
        />

        <div
          style={{
            maxWidth: '900px',
            margin: '0 auto',
            textAlign: 'center',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <div
            style={{
              width: '66px',
              height: '66px',
              borderRadius: '50%',
              background:
                'rgba(244,196,48,0.12)',
              border:
                '1px solid rgba(244,196,48,0.35)',
              color: '#FFD95A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 23px',
              fontSize: '25px',
              boxShadow:
                '0 12px 28px rgba(0,0,0,0.12)',
            }}
          >
            <FaMapMarkerAlt />
          </div>

          <h2
            style={{
              margin: '0 0 16px',
              color: '#FFFFFF',
              fontFamily:
                'Georgia, "Times New Roman", serif',
              fontSize:
                'clamp(29px, 4vw, 43px)',
              fontWeight: '600',
            }}
          >
            Ready for Delivery
          </h2>

          <div
            style={{
              width: '55px',
              height: '4px',
              background: '#F4C430',
              borderRadius: '10px',
              margin: '0 auto 22px',
            }}
          />

          <p
            style={{
              maxWidth: '680px',
              margin: '0 auto',
              color:
                'rgba(255,255,255,0.80)',
              lineHeight: 1.85,
              fontSize: '15px',
            }}
          >
            Once your approved design has been printed
            and prepared, your order will be delivered to
            the address provided during checkout or made
            ready for studio pickup.
          </p>
        </div>
      </section>

      {/* =========================================================
          CTA
      ========================================================= */}
      <section
        className="how-it-works-cta"
        style={{
          padding: '78px 20px',
          background: '#FFFFFF',
        }}
      >
        <div
          style={{
            maxWidth: '850px',
            margin: '0 auto',
            textAlign: 'center',
          }}
        >
          <span
            style={{
              display: 'inline-block',
              color: '#D39E00',
              fontSize: '12px',
              fontWeight: '800',
              letterSpacing: '1.6px',
              textTransform: 'uppercase',
              marginBottom: '4px',
            }}
          >
            Start Your Project
          </span>

          <h2
            style={{
              margin: '12px 0 15px',
              color: '#0B3D91',
              fontFamily:
                'Georgia, "Times New Roman", serif',
              fontSize:
                'clamp(29px, 4vw, 41px)',
              fontWeight: '600',
            }}
          >
            Ready to Create Your Flex?
          </h2>

          <div
            style={{
              width: '55px',
              height: '4px',
              background: '#F4C430',
              borderRadius: '10px',
              margin: '0 auto 20px',
            }}
          />

          <p
            style={{
              margin: '0 auto 30px',
              color: '#667085',
              lineHeight: 1.75,
              maxWidth: '620px',
            }}
          >
            Explore our designs and start your order
            today. Your design, your approval, your final
            flex.
          </p>

          <Link
            to="/catalogue"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              padding: '15px 30px',
              borderRadius: '12px',
              background:
                'linear-gradient(135deg, #0B3D91, #1456B8)',
              color: '#FFFFFF',
              textDecoration: 'none',
              fontWeight: '800',
              fontSize: '14px',
              boxShadow:
                '0 12px 28px rgba(11,61,145,0.20)',
              transition:
                'transform 0.2s ease, box-shadow 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform =
                'translateY(-3px)';
              e.currentTarget.style.boxShadow =
                '0 16px 32px rgba(11,61,145,0.27)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform =
                'translateY(0)';
              e.currentTarget.style.boxShadow =
                '0 12px 28px rgba(11,61,145,0.20)';
            }}
          >
            Explore Designs
            <FaArrowRight size={13} />
          </Link>
        </div>
      </section>
    </div>
  );
};

export default HowIt;