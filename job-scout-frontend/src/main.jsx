// In src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import App from './App.jsx';
import HomePage from './pages/HomePage.jsx';
import CompanyJobsPage from './pages/CompanyJobsPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';

// Define the application's routes
const router = createBrowserRouter([
  {
    path: "/",
    element: <App />, // App is the main layout
    children: [ // These components will render inside App's <Outlet />
      {
        index: true, // This is the default child route for "/"
        element: <HomePage />,
      },
      {
        path: "/jobs/:companyName", // The ":companyName" is a URL parameter
        element: <CompanyJobsPage />,
      },
      { // <-- 2. ADD THIS NEW ROUTE OBJECT
        path: "/profile",
        element: <ProfilePage />,
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);