import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import BenchmarkPage from './pages/BenchmarkPage';
import LoginPage from './pages/LoginPage';
import PersonalSpace from './pages/PersonalSpace';
import { AuthProvider } from './hooks/useAuth';
import reportWebVitals from './reportWebVitals';
import { QueryParamProvider } from 'use-query-params';
import { ReactRouter6Adapter } from 'use-query-params/adapters/react-router-6';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <QueryParamProvider adapter={ReactRouter6Adapter}>
          <Routes>
            <Route path="/" element={<App />}/>
            <Route path="/login" element={<LoginPage />}/>
            <Route path="/me" element={<PersonalSpace />}/>
            <Route path="/benchmark" element={<BenchmarkPage />}/>
          </Routes>
        </QueryParamProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
