import './App.css'
import './App.css';
import {
    BrowserRouter,
    Routes,
    Route,
    useLocation,
    Navigate
} from 'react-router-dom';
import Home from './pages/Home/Home';
import Navigation from './components/shared/Navigation/Navigation';
import Authenticate from './pages/Authenticate/Authenticate';
import Rooms from './pages/Rooms/Rooms';
import { useSelector } from 'react-redux';
import Activate from './pages/Activate/Activate';
import { useLoadingWithRefresh } from './hooks/useLoadingWithRefresh';
import Loader from './components/shared/Loader/Loader';




function App() {

    const { loading } = useLoadingWithRefresh();
    if (loading) {
        return <Loader message={"Loading, please wait... "}/>
    }
  return (
    <BrowserRouter>
    <Navigation/>
        <Routes>
            <Route
                path="/"
                element={
                    <GuestRoute>
                        <Home />
                    </GuestRoute>}
            />
            <Route
                path="/authenticate"
                element={
                    <GuestRoute>
                        <Authenticate />
                    </GuestRoute>}
            />
            <Route
                path="/activate"
                element={
                    <SemiProtectedRoute>
                        <Activate />
                    </SemiProtectedRoute>}
            />
            <Route
                path="/rooms"
                element={
                    <ProtectedRoute>
                        <Rooms />
                    </ProtectedRoute>}
            />


        </Routes>
    </BrowserRouter>

);
}

const GuestRoute = ({ children }) => {

    const { isAuth } = useSelector((state) => state.auth);  //value from redux store

    const location = useLocation();
    if (isAuth) {
        return (
            <Navigate
                to="/rooms"
                state={{ from: location }}
                replace
            />
        );
    }
    return children;

};



const SemiProtectedRoute = ({ children }) => {
    const { user, isAuth } = useSelector((state) => state.auth);
    const location = useLocation();
    if (!isAuth) {
        return (
            <Navigate
                to="/"
                state={{ from: location }}
                replace
            />
        );
    }
    if (isAuth && !user?.activated) {
        return children;
    }
    return (
        <Navigate
            to="/rooms"
            state={{ from: location }}
            replace
        />
    );
};



const ProtectedRoute = ({ children }) => {
    const { user, isAuth } = useSelector((state) => state.auth);
    const location = useLocation();
    if (!isAuth) {
        return (
            <Navigate
                to="/"
                state={{ from: location }}
                replace
            />
        );
    }
    if (isAuth && !user?.activated) {
        return (
            <Navigate
                to="/activate"
                state={{ from: location }}
                replace
            />
        );
    }

    return children;

};



export default App
