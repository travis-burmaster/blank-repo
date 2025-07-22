import React from 'react';
import { BrowserRouter as Router, Route, Switch, Redirect } from 'react-router-dom';
import { ThemeProvider } from '@material-ui/core/styles';
import CssBaseline from '@material-ui/core/CssBaseline';
import theme from './theme';

// Component imports
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import TrainingPlan from './pages/TrainingPlan';
import WorkoutLog from './pages/WorkoutLog';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Register from './pages/Register';
import NotFound from './pages/NotFound';

// Context imports
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';

const App = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <div className="app">
            <Navbar />
            <main className="main-content">
              <Switch>
                <Route exact path="/" render={() => <Redirect to="/dashboard" />} />
                <Route path="/login" component={Login} />
                <Route path="/register" component={Register} />
                <PrivateRoute path="/dashboard" component={Dashboard} />
                <PrivateRoute path="/training-plan" component={TrainingPlan} />
                <PrivateRoute path="/workout-log" component={WorkoutLog} />
                <PrivateRoute path="/profile" component={Profile} />
                <Route path="*" component={NotFound} />
              </Switch>
            </main>
          </div>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;