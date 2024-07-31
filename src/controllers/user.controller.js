import { asyncHandeler } from "../utilis/asyncHandeler.js";


const registerUser = asyncHandeler( async(req,res) =>{
     res.status(200).json({
        message:"Apoorv Raj"
    })
})


export {registerUser}