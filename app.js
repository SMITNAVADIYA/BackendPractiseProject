
import { config } from 'dotenv';
config();
import express from 'express';

const app = express();

const PORT = process.env.PORT || 3000;

app.get('/',(req,res) => {
    res.send('<h1>This is dummy response</h1>')
});

app.listen(PORT, () => {
    console.log(`Server is started on PORT ${PORT}`)
})