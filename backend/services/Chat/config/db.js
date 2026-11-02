import mongoose from "mongoose";

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("mongodb is connected")
    } catch (error) {
        console.log("There is some issue while connecting to mongodb", error);
    }
}

export default connectDB;