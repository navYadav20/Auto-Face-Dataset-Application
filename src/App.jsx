import { BrowserRouter, Route, Routes } from 'react-router-dom'
import CameraFeedv11 from './components/CameraFeedv11'
import Home from './utils/Home'

function App() {
  return (
    <div className="app">
      {/* <h1>Face Orientation Detector</h1> */}
      
      {/* <CameraFeed /> */}
      <BrowserRouter>
      <Routes>
        <Route path='/' element={<Home/>}/>
        <Route path='/capture' element={<CameraFeedv11/>}/>
      </Routes>
      </BrowserRouter>
    </div>
  )
}

export default App