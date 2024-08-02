import { asyncHandeler } from "../utilis/asyncHandeler.js";
import {ApiError} from "../utilis/ApiError.js"
import {User} from "../models/user.models.js"
import {uploadOnCloudinary} from "../utilis/cloudinary.js"
import { ApiResponse } from "../utilis/ApiResponse.js";




const generateAccessAndRefreshTokens = async(userId)=>{
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefershToken()

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave:false})

        return {accessToken,refreshToken}
        
    } catch (error) {
        throw new ApiError(500,"Something went wrong while generating refresh and access token")
    }
}

const registerUser = asyncHandeler( async(req,res) =>{
    //get user details from frontend
    //validation - not empty
    //check if user already exists : username,email
    // check for images,check for avatar
    // upload them to cloudinary,avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation 
    // return response


    const {fullname,email,username,password} = req.body
    // console.log(`email:${email}  fullname:${fullname} username:${username} password:${password}`)

    // if(fullname === "")
    //     throw new ApiErr(400,"fullname is required")


    if (
        [fullname,email,username,password].some((field)=>field?.trim() === "")
    ) {
        throw new ApiError(400,"All Fields are required");
        
    }

    const existedUser = await User.findOne({
        $or:[{username},{email}]
    })

    if(existedUser)
    {
        throw new ApiError(409,"User already exists")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    //const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage && req.files.coverImage.length>0))
    {
        coverImageLocalPath = req.files.coverImage[0];
    }
     

    if(!avatarLocalPath){
        throw new ApiError(400,"Please upload avatar")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar){
        throw new ApiError(400,"Please upload avatar")
    }

    const user = await User.create({
        fullname,
        avatar:avatar.url,
        coverImage:coverImage?.url || "",
        email,
        password,
        username:username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError(500,"Something went wrong by registering a user")
    }

    return res.status(201).json(
        new ApiResponse(200,createdUser,"User Registered Sucessfully")
    )


})

const loginUser = asyncHandeler(async(req,res)=>{
    // get user details from frontend
    // username and email
    // find the user
    // check password
    // access and refesh token generate
    // send cookie


    const {email,username,password} = req.body

    if(!username || !email)
    {
        throw new ApiError(400,"username or email is required")
    }

    const user = await User.findOne($or[{username},{email}])

    if(!user){
        throw new ApiError(404,"User does not exist")
    }

    const isPasswordValid= await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new ApiError(404,"Password is incorrect");
    }

    const {accessToken,refreshToken} = await generateAccessAndRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly:true,
        secure:true
    }

    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(200,
            {
                user:loggedInUser,accessToken,refreshToken
            },
            "User Logged In Sucessfully"
        )
    )


})

const logoutUser = asyncHandeler(async(req,res) =>{

    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken:undefined
            }
        },
        {
            new:true
        }
    )

    const options = {
        httpOnly:true,
        secure:true
    }

    return res
    .status(200)
    .clearcookie("accessToken",options)
    .clearcookie("refreshToken",options)
    .json(new ApiResponse(200,{},"User Logged Out"))

    
})


export {registerUser,
    loginUser,
    logoutUser
}