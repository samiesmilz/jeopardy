//

// Declarations and initial assignments
const NUM_CATEGORIES = 6;
const NUM_QUESTIONS_PER_CAT = 5;
let categories = [];

// Minimum number of clues required for a category
const MIN_CLUES_PER_CATEGORY = NUM_QUESTIONS_PER_CAT;

// Fetch 100 category IDs from the API and ensure they have enough clues
async function getCategoryIds() {
  try {
    // Fetch 100 categories from the API
    const response = await axios.get("https://jservice.io/api/categories", {
      params: { count: 100 },
    });

    // Filter categories with enough clues
    const filteredCategories = response.data.filter(
      (category) => category.clues_count >= MIN_CLUES_PER_CATEGORY
    );

    // Ensure that you have exactly 6 unique category IDs
    const catIds = _.sampleSize(filteredCategories, NUM_CATEGORIES).map(
      (category) => category.id
    );

    return catIds;
  } catch (error) {
    console.error("Error fetching category IDs: ", error);
    return [];
  }
}

/**
 * Fetch category data based on a given category ID.
 * @returns - An object containing the category title and an array of clues or null if there was an error.
 */

async function getCategory(catId) {
  try {
    // Make an API request to fetch category data for the provided category ID
    const response = await axios.get("https://jservice.io/api/category", {
      params: { id: catId },
    });

    // Extract the category title and clues data from the API response
    const categoryTitle = response.data.title;
    const categoryClues = response.data.clues;

    // Randomly select a subset of clues for the category and create an array of clue objects
    const cluesArray = _.sampleSize(categoryClues, NUM_QUESTIONS_PER_CAT).map(
      (clue) => ({
        question: clue.question,
        answer: clue.answer,
        showing: null, // Initialize the 'showing' state as null (neither question nor answer is showing)
      })
    );
    // Return an object containing the category title and the array of clues
    return { title: categoryTitle, clues: cluesArray };
  } catch (error) {
    // Handle any errors that occur during the data fetch
    console.error(`Error fetching category data: ${error}`);
    return null; // Skip this category if there is an error
  }
}

/**
 * This function fetches category data by repeatedly calling the 'getCategoryIds' and 'getCategory' functions
 * until it populates 'categories' with the required number of categories.
 * @returns {Array} - An array of category data objects.
 */

async function getCategories() {
  categories = []; // Initialize the 'categories' array to store category data

  // Continue fetching categories until the desired number of categories is met
  while (categories.length < NUM_CATEGORIES) {
    // Get a list of random category IDs using 'getCategoryIds'
    const categoryIds = await getCategoryIds();

    // Iterate through the fetched category IDs
    for (const categoryId of categoryIds) {
      // Fetch data for each category using 'getCategory'
      const categoryData = await getCategory(categoryId);

      // Check if data was successfully retrieved for the category
      if (categoryData) {
        categories.push(categoryData); // Add the category data to 'categories' if it's valid
      }
    }
  }
  // Return the array of category data
  return categories;
}

/**
 * Create the Jeopardy table structure.
 * This function generates the table structure for the Jeopardy game, including category titles and cells for questions.
 */

function createTable() {
  // Create the main table element with the "id" attribute set to "jeopardy"
  const jeopardyTable = $("<table>").attr("id", "jeopardy");
  const jeopardyBoard = $("<tbody>"); // Create the table body
  const thead = $("<thead>"); // Create the table head
  const categoriesRow = $("<tr>"); // Create a row for category titles

  // Iterate through the categories and create table header cells for each category
  for (const category of categories) {
    const th = $("<th>").text(category.title); // Create a table header cell
    categoriesRow.append(th); // Add the cell to the categories row
  }
  thead.append(categoriesRow); // Add the categories row to the table head

  // Generate cells for questions and answers
  for (let i = 0; i < NUM_QUESTIONS_PER_CAT; i++) {
    const row = $("<tr>"); // Create a row for questions and answers
    for (let catIndex = 0; catIndex < NUM_CATEGORIES; catIndex++) {
      const cell = $("<td>")
        .text("?") // Set the initial content of the cell to "?"
        .addClass("cell") // Add a class for styling
        .attr("id", `${catIndex}-${i}`); // Set a unique ID for the cell
      row.append(cell); // Add the cell to the row
    }
    jeopardyBoard.append(row); // Add the row to the table body
  }
  jeopardyTable.append(thead); // Add the table head to the main table
  jeopardyTable.append(jeopardyBoard); // Add the table body to the main table
  $("body").append(jeopardyTable); // Add the main table to the HTML body
}

/**
 * Handle click event for revealing questions and answers.
 */

function handleClick(evt) {
  // Extract the ID of the clicked cell in the format "catId-clueId"
  const id = evt.target.id;
  const [catId, clueId] = id.split("-");

  // Retrieve the category data based on the category ID
  const category = categories[catId];

  // Check if the category and clue exist
  if (category && category.clues[clueId]) {
    // Retrieve the clicked clue
    const clue = category.clues[clueId];
    let msg;

    // Determine whether to show the question or answer
    if (!clue.showing) {
      msg = clue.question;
      clue.showing = "question"; // Set the state to "question"
    } else if (clue.showing === "question") {
      msg = clue.answer;
      clue.showing = "answer"; // Set the state to "answer"
      // Add the "revealed" class to change the background color
      $(`#${catId}-${clueId}`).addClass("revealed");
    } else {
      return; // Already showing answer; ignore
    }

    // Update the content of the clicked cell with the question or answer
    $(`#${catId}-${clueId}`).html(msg);
  }
}

// Restart game function
async function restartGame() {
  try {
    // Fetch new categories
    const newCategories = await getCategories();
    categories = newCategories;
    resetCellColors();

    // Populate the existing headers with new category titles
    const $headers = $("#jeopardy thead th");
    for (let i = 0; i < NUM_CATEGORIES; i++) {
      $headers.eq(i).text(categories[i].title);
    }

    // Populate the existing cell data with "?" for questions
    const $cells = $("#jeopardy tbody .cell");
    $cells.text("?");
  } catch (error) {
    console.error("Error restarting game: ", error);
  }
}

// Function to reset cell background color
function resetCellColors() {
  $(".cell").removeClass("revealed");
}

// Event handler for the restart button
$("body").on("click", "#restart-game-btn", async function (evt) {
  // Disable the restart button to prevent multiple clicks
  $(this).prop("disabled", true);

  // Restart the game and fetch new categories

  // Show the loading message
  $("#loading-message").show();
  await restartGame();
  // Hide the loading message when the data is ready
  $("#loading-message").hide();

  // After the table is fully populated, enable the restart button again
  $(this).prop("disabled", false);
});

// Create a restart button and add it to the page.
function createBtn() {
  const restartBtn = $("<button>Restart Game</button>")
    .attr("id", "restart-game-btn")
    .prop("disabled", false);
  $("body").append(restartBtn);
}

// Event delegation to handle clicking on clues.
$("body").on("click", ".cell", function (evt) {
  handleClick(evt);
});

// Initialize the game on page load.
$(document).ready(async function () {
  // Show the loading message
  $("#loading-message").show();
  await getCategories().then(createTable);
  createBtn();
  // Hide the loading message when the data is ready
  $("#loading-message").hide();
});
