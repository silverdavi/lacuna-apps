// Built-in deck: famous public figures, fictional characters and common nouns only.
// The first entries of each category come from the original printable "Who am I" sheet.
export const CATEGORIES = [
  'Music',
  'Sports',
  'YouTube',
  'Science',
  'History',
  'Movies',
  'Space',
  'Explorer',
  'Character',
  'Animals',
  'Places',
  'Foods',
] as const

export type Category = (typeof CATEGORIES)[number]

export type Card = { text: string; category: string }

const RAW: Record<Category, string[]> = {
  Music: [
    'Bad Bunny', 'Taylor Swift', 'Beyoncé', 'Drake', 'Bruno Mars', 'Michael Jackson', 'Billie Eilish',
    'Elvis Presley', 'The Beatles', 'Madonna', 'Adele', 'Ed Sheeran', 'Rihanna', 'Lady Gaga', 'Prince',
    'Queen', 'Ariana Grande', 'Justin Bieber', 'Shakira', 'Eminem', 'Elton John', 'Bob Marley',
    'Dua Lipa', 'Harry Styles', 'Olivia Rodrigo', 'Jay-Z', 'Whitney Houston', 'Louis Armstrong',
    'Mozart', 'Beethoven', 'Johnny Cash', 'Katy Perry', 'The Weeknd', 'BTS',
  ],
  Sports: [
    'Lionel Messi', 'LeBron James', 'Simone Biles', 'Cristiano Ronaldo', 'Stephen Curry', 'Usain Bolt',
    'Serena Williams', 'Michael Jordan', 'Muhammad Ali', 'Tom Brady', 'Roger Federer', 'Tiger Woods',
    'Michael Phelps', 'Pelé', 'Diego Maradona', 'Kobe Bryant', 'Shaquille O’Neal', 'Babe Ruth',
    'Wayne Gretzky', 'Novak Djokovic', 'Naomi Osaka', 'Megan Rapinoe', 'Neymar', 'Kylian Mbappé',
    'Patrick Mahomes', 'Lewis Hamilton', 'Nadia Comaneci', 'Jesse Owens', 'Venus Williams', 'Rafael Nadal',
    'Shohei Ohtani', 'Caitlin Clark',
  ],
  YouTube: [
    'MrBeast', 'Ms. Rachel', 'Blippi', 'Mark Rober', 'PewDiePie', 'Dude Perfect',
    'Cocomelon', 'Baby Shark', 'Kurzgesagt', 'Vsauce', 'Marques Brownlee', 'Markiplier', 
    'Ninja', 'Peppa Pig', 'Veritasium', 'SmarterEveryDay', 'Crash Course',
    'Minecraft Let’s Play', 'Unboxing Video', 'Slime Video', 'Dance Challenge', 'Cooking Tutorial',
    'Gameplay Stream', 'Prank Video', 'Vlog', 'Lego Review', 'Science Experiment',
  ],
  Science: [
    'Albert Einstein', 'Marie Curie', 'Isaac Newton', 'Nikola Tesla', 'Jane Goodall', 'Charles Darwin',
    'Galileo', 'Stephen Hawking', 'Ada Lovelace', 'Alan Turing', 'Thomas Edison', 'Louis Pasteur',
    'Rosalind Franklin', 'Carl Sagan', 'Neil deGrasse Tyson', 'Benjamin Franklin', 'Gregor Mendel',
    'Katherine Johnson', 'Alexander Fleming', 'Dmitri Mendeleev', 'Archimedes', 'Aristotle',
    'Johannes Kepler', 'Copernicus', 'Michael Faraday', 'Jonas Salk', 'Grace Hopper', 'Rachel Carson',
    'Atom', 'DNA', 'Volcano', 'Microscope', 'Black Hole', 'Rainbow',
  ],
  History: [
    'Abraham Lincoln', 'Martin Luther King Jr.', 'Rosa Parks', 'George Washington', 'Cleopatra',
    'Julius Caesar', 'Napoleon', 'Queen Victoria', 'Winston Churchill', 'Nelson Mandela', 'Mahatma Gandhi',
    'Joan of Arc', 'Genghis Khan', 'Harriet Tubman', 'Frederick Douglass', 'Queen Elizabeth II',
    'Alexander the Great', 'King Tut', 'Leonardo da Vinci', 'Michelangelo', 'Christopher Columbus',
    'Florence Nightingale', 'Thomas Jefferson', 'Theodore Roosevelt', 'Anne Frank', 'Helen Keller',
    'William Shakespeare', 'Vincent van Gogh', 'Pablo Picasso', 'Frida Kahlo', 'Wright Brothers',
    'Pharaoh', 'Viking', 'Knight',
  ],
  Movies: [
    'Tom Hanks', 'Will Smith', 'Dwayne Johnson', 'Tom Cruise', 'Jackie Chan', 'Zendaya',
    'Robert Downey Jr.', 'Chris Hemsworth', 'Scarlett Johansson', 'Ryan Reynolds', 'Meryl Streep',
    'Harrison Ford', 'Samuel L. Jackson', 'Morgan Freeman', 'Emma Watson', 'Daniel Radcliffe',
    'Keanu Reeves', 'Julia Roberts', 'Leonardo DiCaprio', 'Jennifer Lawrence', 'Chris Pratt',
    'Charlie Chaplin', 'Marilyn Monroe', 'Audrey Hepburn', 'Steven Spielberg', 'George Lucas',
    'Walt Disney', 'Jim Carrey', 'Robin Williams', 'Bruce Lee', 'Gal Gadot', 'Timothée Chalamet',
    'Hugh Jackman',
  ],
  Space: [
    'Neil Armstrong', 'Buzz Aldrin', 'Sally Ride', 'Yuri Gagarin', 'John Glenn', 'Mae Jemison',
    'Chris Hadfield', 'Valentina Tereshkova', 'Mars', 'Jupiter', 'Saturn', 'Venus', 'Mercury', 'Neptune',
    'Uranus', 'Pluto', 'The Moon', 'The Sun', 'Milky Way', 'Halley’s Comet', 'Space Shuttle',
    'Hubble Telescope', 'International Space Station', 'Apollo 11', 'Rocket', 'Astronaut', 'Asteroid',
    'Solar Eclipse', 'Telescope', 'Satellite', 'Alien', 'Constellation',
  ],
  Explorer: [
    'Amelia Earhart', 'Christopher Columbus', 'Marco Polo', 'Ferdinand Magellan', 'Lewis and Clark',
    'Sacagawea', 'Roald Amundsen', 'Ernest Shackleton', 'Edmund Hillary', 'Tenzing Norgay', 'Jacques Cousteau',
    'Captain Cook', 'Vasco da Gama', 'Leif Erikson', 'Ibn Battuta', 'Zheng He', 'Robert Peary',
    'David Livingstone', 'Henry Hudson', 'Charles Lindbergh', 'Matthew Henson', 'Hernán Cortés',
    'Jacques Cartier', 'Neil Armstrong', 'Bessie Coleman', 'Sylvia Earle', 'Robert Ballard',
    'Thor Heyerdahl', 'Compass', 'Sextant',
  ],
  Character: [
    'Elsa', 'Mickey Mouse', 'SpongeBob', 'Mario', 'Moana', 'Spider-Man', 'Bluey', 'Batman', 'Superman',
    'Wonder Woman', 'Iron Man', 'Hulk', 'Captain America', 'Pikachu', 'Sonic', 'Luigi', 'Princess Peach',
    'Yoda', 'Darth Vader', 'Harry Potter', 'Hermione Granger', 'Winnie the Pooh', 'Buzz Lightyear',
    'Woody', 'Simba', 'Nemo', 'Dory', 'Shrek', 'Donald Duck', 'Minnie Mouse', 'Cinderella',
    'Snow White', 'Peter Pan', 'Bugs Bunny', 'Homer Simpson', 'Scooby-Doo', 'Olaf', 'Elmo',
    'Cookie Monster', 'Kermit the Frog', 'Link', 'Donkey Kong',
  ],
  Animals: [
    'Elephant', 'Giraffe', 'Penguin', 'Kangaroo', 'Octopus', 'Dolphin', 'Lion', 'Tiger', 'Panda', 'Koala',
    'Gorilla', 'Flamingo', 'Zebra', 'Hippo', 'Crocodile', 'Owl', 'Peacock', 'Sloth', 'Cheetah', 'Camel',
    'Polar Bear', 'Hedgehog', 'Jellyfish', 'Butterfly', 'Chameleon', 'Turtle', 'Shark', 'Whale', 'Bat',
    'Parrot', 'Squirrel', 'Rhinoceros', 'Seahorse', 'Platypus',
  ],
  Places: [
    'Eiffel Tower', 'Statue of Liberty', 'Great Wall of China', 'Grand Canyon', 'Mount Everest', 'Niagara Falls',
    'Pyramids of Giza', 'Big Ben', 'Taj Mahal', 'Colosseum', 'Golden Gate Bridge', 'Sydney Opera House',
    'Machu Picchu', 'Disney World', 'Times Square', 'Hollywood', 'Amazon Rainforest', 'Sahara Desert',
    'Antarctica', 'Hawaii', 'Paris', 'Tokyo', 'New York City', 'London', 'Venice', 'Rome', 'Egypt',
    'Brazil', 'Australia', 'Mount Rushmore', 'Leaning Tower of Pisa', 'Stonehenge', 'Yellowstone', 'Alcatraz',
  ],
  Foods: [
    'Pizza', 'Hamburger', 'Spaghetti', 'Tacos', 'Sushi', 'Ice Cream', 'Pancakes', 'Popcorn', 'Chocolate',
    'French Fries', 'Hot Dog', 'Watermelon', 'Pineapple', 'Banana', 'Strawberry', 'Avocado', 'Broccoli',
    'Carrot', 'Cheese', 'Donut', 'Cupcake', 'Pretzel', 'Burrito', 'Lasagna', 'Cereal', 'Sandwich',
    'Waffle', 'Mac and Cheese', 'Apple Pie', 'Pumpkin', 'Coconut', 'Cookie', 'Nachos', 'Marshmallow',
  ],
}

// A name appears once, under the first category that lists it.
const seen = new Set<string>()
export const DECK: Card[] = CATEGORIES.flatMap((category) =>
  RAW[category]
    .filter((text) => !seen.has(text) && !!seen.add(text))
    .map((text) => ({ text, category })),
)

export function countByCategory(): Record<string, number> {
  const out: Record<string, number> = {}
  for (const c of DECK) out[c.category] = (out[c.category] ?? 0) + 1
  return out
}
