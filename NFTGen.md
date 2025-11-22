I want to create a Chat Interface like GPT.

Where a user asks a query, its gets response from the llm. But in realtime. I want it to stream the response.Analyze the backend server code so far and create a database structure for chat interface. 

A user can only have upto 5 chats, cannot open more than that. 
Add a token usage limit for the user, user can only user lets say 100k token for now, can be modifiable.
In every chat the query will go to some llm, & the response will be streamed without any filter for now. Create a good sytem prompt to generate the response. Use gemini Pro 3.0 for this chat apis. User can start a new chat, or can continue from old chat, please save query & response from each chat with timestamps in db. 

Act like a senior backend architect & spit out the api structures, db design & schemas needed for this to happen.

Things to keep in mind:

Right we only want chat streaming from gemini 3.0 pro, but in future we would add feature where user can generate or upload images and ask t tweak the images in the chat. So keep that in mind while designing & generating api schemas. 


Dont do any code right now just design this & lmk which packages are you going to use & designs.