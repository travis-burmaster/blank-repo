import React from 'react';
import { BrowserRouter as Router, Route, Switch, Redirect } from 'react-router-dom';
import { ThemeProvider } from '@material-ui/core/styles';
import CssBaseline from '@material-ui/core/CssBaseline';
import theme from './theme';

// Component imports
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Training from './pages/Training';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Register from './pages/Register';
import NotFound from './pages/NotFound';

// Context provider
import { AuthProvider } from './context/AuthContext';

const App = () => {
  // Protected route component
  const PrivateRoute = ({ component: Component, ...rest }) => (
    <Route
      {...rest}
      render={props =>
        localStorage.getItem('authToken') ? (
          <Component {...props} />
        ) : (
          <Redirect to="/login" />
        )
      }
    />
  );

  return (
    <AuthProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <div className="app">
            <Navbar />
            <main className="main-content">
              <Switch>
                <Route exact path="/" component={Dashboard} />
                <PrivateRoute path="/training" component={Training} />
                <PrivateRoute path="/profile" component={Profile} />
                <Route path="/login" component={Login} />
                <Route path="/register" component={Register} />
                <Route path="/404" component={NotFound} />
                <Redirect to="/404" />
              </Switch>
            </main>
          </div>
        </Router>
      </ThemeProvider>
    </AuthProvider>
  );
};

export default App;