const axios = require('axios');
const fs = require('fs');

const searchQueries = ['Samsung Galaxy S23 ultra', 'Iphone 14 max pro review'];
const apiKey = 'AIzaSyDAspD7lltWwO7RiJhL4nMwDkKzmam-NhE';
const maxResults = 10;
const numPages = 3;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchTopVideoIds(searchQuery, apiKey, maxResults) {
  try {
    const response = await axios.get(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodeURIComponent(searchQuery)}&key=${apiKey}&maxResults=${maxResults}&relevanceLanguage=en&videoDefinition=high`
    );
    return response.data.items.map(item => item.id.videoId);
  } catch (error) {
    console.error('Error fetching video IDs:', error);
    return [];
  }
}

async function gatherCommentsFromTopVideos(searchQuery, apiKey, maxResults, numPages) {
  const topVideoIds = await fetchTopVideoIds(searchQuery, apiKey, maxResults);
  let allComments = [];

  for (const videoId of topVideoIds) {
    const comments = await fetchComments(videoId, apiKey, maxResults, numPages, searchQuery);
    allComments = allComments.concat(comments);
  }

  return allComments;
}

async function fetchComments(videoId, apiKey, maxResults, numPages, searchQuery) {
  let pageToken = null;
  let allComments = [];

  for (let i = 0; i < numPages; i++) {
    try {
      const response = await axios.get(
        `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&key=${apiKey}&maxResults=${maxResults}&pageToken=${pageToken || ''}`
      );
      const comments = response.data.items.map(item => {
        return {
          author: item.snippet.topLevelComment.snippet.authorDisplayName,
          text: item.snippet.topLevelComment.snippet.textDisplay,
        };
      });

      allComments = allComments.concat(comments);
      pageToken = response.data.nextPageToken;

      if (!pageToken) {
        break;
      }

      await sleep(1000);
    } catch (error) {
      console.error('Error fetching comments:', error);
      break;
    }
  }

  return allComments
}


(async () => {
  for (const searchQuery of searchQueries) {
    console.log(`Processing search query: ${searchQuery}`);
    try {
      const comments = await gatherCommentsFromTopVideos(searchQuery, apiKey, maxResults, numPages);

      console.log(`Comments from top 10 videos for "${searchQuery}":`, comments);

      // Save comments to a JSON file named after the search query
      const outputFileName = `${searchQuery.replace(/[^a-zA-Z0-9-_]/g, '_')}_comments.json`;
      fs.writeFileSync(outputFileName, JSON.stringify(comments, null, 2));
      console.log(`Comments saved to ${outputFileName}`);
    } catch (error) {
      console.error(`Error gathering comments from top videos for "${searchQuery}":`, error);
    }
  }
})();
