import dotenv from "dotenv";
dotenv.config();
import express from "express";
import bodyParser from "body-parser";
import nameToImdbModule from "name-to-imdb";
import axios from "axios";
import pg from "pg";
import pkg from "pg";

const app = express();
const port = 3000;

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));


const { Pool } =pkg;

const db = new Pool({
  connectionString: 'postgres://root:yuRmiiFVpMkq8PEvQgiLCELEaiiVmgXb@dpg-cmshjced3nmc73et6vf0-a.oregon-postgres.render.com/moviedb_72er',
  ssl: {
    rejectUnauthorized: false,
  },
});


db.connect();
let imdbId = null;
let title,
  year,
  released,
  genre,
  director,
  actor,
  plot,
  rating,
  awards,
  posters,
  boxoffice;
function getImdbId(name) {
  return new Promise((resolve, reject) => {
    nameToImdbModule(name, function (err, res, inf) {
      if (err) {
        reject(err);
      } else {
        resolve(res);
      }
    });
  });
}

async function getMovieDetails(name) {
  try {
    imdbId = await getImdbId(name);
    console.log("IMDb ID:", imdbId);

    const result = await axios.get(
      `https://www.omdbapi.com/?i=${imdbId}&apikey=88352008`
    );
    title = result.data.Title;
    year = parseInt(result.data.Year);
    released = result.data.Released;
    genre = result.data.Genre;
    director = result.data.Director;
    actor = result.data.Actors;
    plot = result.data.Plot;
    rating = parseFloat(result.data.imdbRating);
    awards = result.data.Awards;
    posters = result.data.Poster;
    boxoffice = result.data.BoxOffice;

     await db.query(
      "INSERT INTO moviedata(title,year,released,genre,director,actor,plot,rating,awards,posters,boxoffice) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)",
      [
        title,
        year,
        released,
        genre,
        director,
        actor,
        plot,
        rating,
        awards,
        posters,
        boxoffice
      ]
    );
  } catch (error) {
    console.error("Error:", error);
    if (error.message.includes("duplicate key value")) {
      res.status(400).send("Movie with the same name already exists.");
      console.log("Movie with the same name already exists in the website.");
    }
  }
}

app.get("/", async (req, res) => {
  const result=await db.query("SELECT * FROM moviedata");
  res.render("index.ejs",{data:result.rows});
});
app.get("/newmovie", (req, res) => {
  res.render("newmovie.ejs");
});
app.post("/delete",async(req,res)=>{
  const id=req.body.delete;
  console.log(id);
  console.log(typeof(id));
  await db.query("DELETE FROM moviedata WHERE id=$1",[parseInt(id)]);
  res.redirect("/");
});
app.post("/dataformate",async(req,res)=>{
  if(req.body.SortBy==="title"){
    const insertdata="title ASC"
    const result=await db.query(`SELECT * FROM moviedata ORDER BY ${insertdata}`);
    res.render("index.ejs",{data:result.rows});
  }else{
    const insertdata=req.body.SortBy+" DESC";
  const result=await db.query(`SELECT * FROM moviedata ORDER BY ${insertdata}`);
  res.render("index.ejs",{data:result.rows});
  }
});
app.post("/edit",async(req,res)=>{
  console.log(req.body.updatedRating);
  await db.query("UPDATE moviedata SET rating=$1 WHERE id=$2",[req.body.updatedRating,req.body.updatedItemId]);
  res.redirect("/");
});
app.post("/imdbid", async (req, res) => {
  const name = req.body.movie;
  console.log("Movie Name:", name);

  await getMovieDetails(name);
  res.redirect("/");
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
