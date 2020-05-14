# FP-Chinese-Character-Frequencies

Team Members: Jenny Zhang

Demo Link: https://youtu.be/JR2cL9jX33I

Project Link: https://github.mit.edu/pages/6894-sp20/FP-Chinese-Character-Frequencies/

## Project Process

I started with the idea of the force network graph early on - I felt it made the most sense since there are many different ways you can relate different Chinese characters, and each character should have its own point (and not be aggregated) to highlight its individual meaning. I thought through different ways of connecting the characters - for instance, possibly by radical. I decided on using words as the connector as then, connections could be made across very different words (in terms of meaning and/or radical) and likely show more interesting connections.

I started by just parsing the dataset into a format suited for force network graphs. Once I had the basic force network graph, I added in more data such as pronunciation and definitions so that I could actually populate the windows in the visualization. I still liked the idea of relating words by radical, since radicals are a great way to see connections between words and thus learn them faster, so I added it as an additional waay to examine the data.

If I were to continue working on this project, there are three main tasks I'd like to focus on. First, I'd want to explore more of the force network graph functionality. I had trouble with getting it to look exactly how I wanted - for instance, I couldn't get the nodes to not overlap. I'd want to look into more solutions for that and possibly look into other encoding channels (such as x,y position). Second, slightly related, I want to expand on the graph customization settings, in particular the parameters of the force network. I hardcoded parameters to be what I thought looked best, but perhaps the user could get some freedom in deciding separation of nodes and such. Lastly, I'd want to expand on the way the "occurrences" data is presented in the right-side information window. The current method of just listing percentages is not super interesting, and I'd like to explore other ways of showing this.
