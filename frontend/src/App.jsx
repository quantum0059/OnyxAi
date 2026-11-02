import { useEffect } from "react"
import Home from "./page/Home"
import currentUser from "./features/getCurrentUser.js"
import { useDispatch } from "react-redux";
import { setUserData, setLoading } from "./redux/userSlice.js";

const App = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    const getUser = async () => {
      try {
        const loggedInUser = await currentUser();
        dispatch(setUserData(loggedInUser));
      } catch (error) {
        console.error(error);
        dispatch(setLoading(false));
      }
    }
    getUser();
  }, [dispatch])

  return (
    <>
      <Home />
    </>
  )
}

export default App


//if we want to put the data into the reducer we use useReducer and if we want to modify it
// we use useSelector