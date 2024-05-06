# factly

## Why ?


The FIR approach `Facts => Insights => Recommendations` is very helpful in my daily work, it provides a structured approach to **extracting unbiased facts related to a problem**, **identifying key insights**, and **formulating actionable recommendations**. This systematic method helps me navigate complex problems more efficiently, ensuring that decisions are grounded in evidence and data-driven insights.

While Excalidraw is a useful tool for visualizing concepts and ideas, It's not adapted for accelerating the execution of the FIR approach. Excalidraw focuses more on visual representation and lacks the specialized features needed to streamline the FIR process. In contrast, a dedicated tool like factly is designed specifically for that, making it more effective for accelerating the execution of the FIR approach and enhancing overall productivity.

## Vision

factly aims to hamonize the way organizations and individuals conduct discoveries. factly provides a web tool for extracting actionable insights from multiples types of inputs using The FIR approach `Facts => Insights => Recommendations`. 

The vision is to create a tool that not only simplifies facts extractions but also empowers users to make informed decisions based on reliable insights.

![UI Capture](./public/ui-capture.png)
*An early capture of the factly UI in action.*

## Getting Started

### Installation

Clone the repository and install its dependencies:

```bash
git clone https://github.com/anasdox/factly.git
cd factly
npm install
```

### Running the Application

To start the application, run the following command in the terminal:

```bash
npm start
```

This will launch the factly web application on `http://localhost:3000`.

## Note on MVP Status
As of now, the MVP of factly is a work in progress. It's not functional yet, but Iam getting there. So, stay tuned for updates, and feel free to contribute if you're up for a bit of a challenge!

### Journey
Ah, the joys of programming! When I first started working on factly, I had this brilliant idea to use React. Little did I know that my useRef hook would become my best friend and my weard nightmare, as I tried to track the positions of cards like a detective on a stakeout.

Then there were the lines, oh the lines! Not the poetic kind, but divs stretched out across the screen, which turned out to be quite the ordeal to manage.

And let's not forget my decision to put all the code into a single file, App.tsx. Some call it madness; I call it focused chaos. Maintenability? Pfft, that's a problem for Future Me. For now, I relish in the simplicity of a single-file symphony, a cacophony of code that somehow harmonizes into a working application.

So, come join me in this quirky quest, and let's make factly not just functional, but fun!

### Todo
- [x] Create UI skeleton
- [x] Manage Links
- [x] Load Discovery in json format
- [x] Save Discovery in json format
- [x] Add Entities: Input, Facts, Insights, Recommendations, Outputs
- [x] Time to make it look nice
- [x] Time for code refactoring (Component Breakdown, Use Custom Hooks)
- [x] Edit entities
- [x] Remove entities
- [ ] Create New discovery
- [x] Create a new link between entites
- [x] Remove a link between entites

### Future Todo
- [ ] Auto Facts extracttion from Text
- [ ] Auto Insights extraction
- [ ] Auto Recomendations extraction
- [ ] Auto Outputs Formulation
- [ ] Manage collaborative discovery live sessions
- [ ] Auto Facts extracttion from WEB
- [ ] Auto Facts extracttion from PDF
- [ ] Auto Facts extracttion from CSV
- [ ] Auto Facts extracttion from Image
- [ ] Auto Facts extracttion from Video
- [ ] Auto Facts extracttion from Audio

## Contributing

We welcome contributions from the community! Whether you're fixing a bug, adding a feature, or improving the documentation, your help is appreciated. Here’s how you can contribute:

1. **Fork the Repository:** Click the fork button on the top right corner of the factly GitHub page.
2. **Clone Your Fork:** Get a copy of your fork on your machine.
3. **Create a Branch:** Create a branch for your modifications.
4. **Make Changes:** Add your changes to your branch.
5. **Test Your Changes:** Ensure your changes do not break any existing functionality.
6. **Submit a Pull Request:** Push your changes to your fork and then submit a pull request to the factly repository.

## License

factly is open source software [licensed as MIT](./LICENCE).
