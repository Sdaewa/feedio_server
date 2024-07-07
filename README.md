# Feedio - Testimonials App



## Features

- Display user testimonials in various layouts.
- Collect feedback and ratings from users.
- Secure user data and interactions.
- Analyze feedback using sentiment analysis.
- Integration with Stripe for payment processing.
- Email notifications using Nodemailer.

## Getting Started

### Prerequisites

- Node.js
- Yarn package manager
- MongoDB

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/sdaewa/feedio.git
   ```

2. **Install dependencies for both frontend and backend using Yarn's workspace feature**
   ```bash
   yarn install
   ```

### Running the App

- **Frontend**

  ```bash
  yarn workspace client start
  ```

- **Backend**
  ```bash
  yarn workspace server start
  ```

## Tech Stack

### Frontend:

- React (v18.2.0)
- @mui/material for Material-UI components
- Axios for HTTP requests
- Chart.js for visualizations
- React Router DOM for routing
- Emotion for styled components
- And more...

### Backend:

- Express.js as the server framework
- Mongoose for MongoDB object modeling
- JSON Web Tokens (JWT) for authentication
- Bcrypt for password hashing
- Handlebars for templating
- Helmet for security headers
- Stripe for payment processing
- Nodemailer for sending emails
- And more...

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

This project is licensed under the ISC License.
