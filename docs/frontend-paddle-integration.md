# Paddle Frontend Integration Guide

## Option 1: Widget Integration (Recommended)

### Step 1: Add Paddle.js to your HTML
```html
<!DOCTYPE html>
<html>
<head>
    <script src="https://cdn.paddle.com/paddle/v2/paddle.js"></script>
</head>
<body>
    <!-- Your app content -->
</body>
</html>
```

### Step 2: Initialize Paddle
```javascript
// Initialize Paddle with your client-side token
Paddle.Setup({
    token: 'your-paddle-client-side-token', // Get this from Paddle dashboard
    environment: 'sandbox' // or 'production'
});
```

### Step 3: Frontend Widget Implementation
```javascript
class SubscriptionWidget {
    constructor() {
        this.apiBaseUrl = 'http://localhost:3000/api';
    }

    async initializeCheckout(priceId, trialDays = 0) {
        try {
            // Get widget checkout data from your backend
            const response = await fetch(`${this.apiBaseUrl}/subscriptions/widget-checkout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getAuthToken()}`
                },
                body: JSON.stringify({
                    priceId: priceId,
                    trialDays: trialDays,
                    checkoutType: 'widget'
                })
            });

            const result = await response.json();
            
            if (result.status === 'success') {
                this.openPaddleCheckout(result.data);
            } else {
                this.handleError(result.message);
            }
        } catch (error) {
            this.handleError('Failed to initialize checkout');
        }
    }

    openPaddleCheckout(checkoutData) {
        // Open Paddle checkout widget
        Paddle.Checkout.open({
            items: checkoutData.checkoutData.items,
            customerId: checkoutData.customerId,
            customData: checkoutData.checkoutData.customData,
            settings: {
                displayMode: 'overlay', // 'overlay' or 'inline'
                theme: 'light', // 'light' or 'dark'
                locale: 'en',
                successUrl: `${window.location.origin}/payment/success`,
                closeUrl: `${window.location.origin}/payment/cancel`
            },
            eventCallback: (data) => {
                this.handlePaddleEvent(data);
            }
        });
    }

    handlePaddleEvent(data) {
        switch (data.name) {
            case 'checkout.loaded':
                console.log('Checkout loaded');
                break;
            case 'checkout.customer.created':
                console.log('Customer created:', data.data);
                break;
            case 'checkout.payment.initiated':
                console.log('Payment initiated');
                break;
            case 'checkout.payment.completed':
                console.log('Payment completed:', data.data);
                this.handlePaymentSuccess(data.data);
                break;
            case 'checkout.payment.failed':
                console.log('Payment failed:', data.data);
                this.handlePaymentFailure(data.data);
                break;
            case 'checkout.closed':
                console.log('Checkout closed');
                break;
        }
    }

    handlePaymentSuccess(paymentData) {
        // Payment successful - redirect to success page
        window.location.href = '/payment/success';
    }

    handlePaymentFailure(errorData) {
        // Payment failed - show error message
        this.showError('Payment failed. Please try again.');
    }

    getAuthToken() {
        // Get JWT token from localStorage, cookies, or your auth system
        return localStorage.getItem('authToken');
    }

    handleError(message) {
        // Show error to user
        alert(message); // Replace with proper error handling
    }

    showError(message) {
        // Show error to user
        alert(message); // Replace with proper error handling
    }
}

// Usage example
const subscriptionWidget = new SubscriptionWidget();

// When user clicks subscribe button
document.getElementById('subscribe-btn').addEventListener('click', () => {
    const priceId = 'pri_01k1bd3n2vz1j5f1hjjqpe18jj'; // Your price ID
    const trialDays = 7; // Optional trial period
    
    subscriptionWidget.initializeCheckout(priceId, trialDays);
});
```

### Step 4: HTML Implementation
```html
<div class="subscription-plans">
    <div class="plan">
        <h3>Premium Plan</h3>
        <p>$20/month</p>
        <button id="subscribe-btn" class="subscribe-button">
            Start 7-Day Free Trial
        </button>
    </div>
</div>

<!-- Payment Success Page -->
<div id="success-page" style="display: none;">
    <h2>Payment Successful!</h2>
    <p>Your subscription has been activated.</p>
    <a href="/dashboard">Go to Dashboard</a>
</div>

<!-- Payment Error Display -->
<div id="error-display" style="display: none;">
    <p id="error-message"></p>
</div>
```

## Option 2: Redirect Approach (Current Implementation)

### Frontend Implementation
```javascript
class SubscriptionRedirect {
    constructor() {
        this.apiBaseUrl = 'http://localhost:3000/api';
    }

    async createCheckout(priceId, trialDays = 0) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/subscriptions/checkout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getAuthToken()}`
                },
                body: JSON.stringify({
                    priceId: priceId,
                    trialDays: trialDays
                })
            });

            const result = await response.json();
            
            if (result.status === 'success') {
                // Redirect to Paddle checkout
                window.location.href = result.data.checkoutUrl;
            } else {
                this.handleError(result.message);
            }
        } catch (error) {
            this.handleError('Failed to create checkout');
        }
    }

    getAuthToken() {
        return localStorage.getItem('authToken');
    }

    handleError(message) {
        alert(message); // Replace with proper error handling
    }
}

// Usage
const subscriptionRedirect = new SubscriptionRedirect();
document.getElementById('subscribe-btn').addEventListener('click', () => {
    subscriptionRedirect.createCheckout('pri_01k1bd3n2vz1j5f1hjjqpe18jj', 7);
});
```

## Comparison

| Feature | Widget Approach | Redirect Approach |
|---------|----------------|-------------------|
| **User Experience** | ✅ Stays on your site | ❌ Leaves your site |
| **Customization** | ✅ More control over styling | ❌ Limited customization |
| **Mobile Experience** | ✅ Better mobile UX | ⚠️ Mobile redirect issues |
| **Implementation** | ⚠️ More complex setup | ✅ Simple implementation |
| **Error Handling** | ✅ Real-time error feedback | ❌ Limited error handling |
| **Analytics Tracking** | ✅ Better conversion tracking | ❌ Harder to track |

## Environment Variables for Frontend

Add these to your frontend environment:

```env
# Frontend .env
REACT_APP_PADDLE_CLIENT_TOKEN=your_paddle_client_token
REACT_APP_PADDLE_ENVIRONMENT=sandbox
REACT_APP_API_BASE_URL=http://localhost:3000/api
```

## Next Steps

1. **Choose your approach**: Widget (recommended) or Redirect
2. **Get Paddle client-side token** from your Paddle dashboard
3. **Implement the frontend code** using the examples above
4. **Test with Paddle test cards**
5. **Set up success/failure pages**
6. **Configure webhook handlers** (already implemented in your backend)

## Test Cards for Paddle

Use these test cards in sandbox mode:
- **Successful payment**: 4000 0000 0000 0002
- **Declined payment**: 4000 0000 0000 0069
- **Expired card**: 4000 0000 0000 0069 (exp: any past date)

The widget approach provides better UX and more control while keeping users on your domain throughout the payment process.
