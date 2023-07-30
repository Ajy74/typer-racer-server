const axios = require("axios");  //axios is like http as in dart

const getSentence = async(retryCount=0) =>{
    try  {
        // const jokeData = await axios.get("https://api.quotable.io/random", {
        //   timeout: 10000, // Set the timeout to 5 seconds (adjust as needed)
        // });
        // // console.log(jokeData.data);

        // return jokeData.data.content.split(' ');
        return "helllow i am ajay mourya".split(' ');
    } catch (e) {
        console.error(`error in getting words:-->${e}`);
        if (retryCount < 3) {
            const retryDelay = 1000 * Math.pow(2, retryCount);
            console.log(`Retrying in ${retryDelay} ms...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            return getSentence(retryCount + 1);
        }
    }
};

module.exports = getSentence;