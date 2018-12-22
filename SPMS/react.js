/*NOTES:
-Portfolios in the localStorage as saved as pair key-value. They key is the name of the portfolio and the
value an array (converted to string) with the stocks of the portfolio.

-The SPMS app load the portfolios only using their names. Each portfolio, once created is responsible of fetching their own
stocks from the localStorage as well as updating them.
 */


//In the localStorage, assing a stocks array to the portfolio specified if there is space left
//Used for adding new stocks into a portfolio or creating a new portfolio with no stocks
//Return true if the portfolio or the stocks where added.
function StocksToPortfolioInStorage(portfolioName, portfolioStocks){
    let success = false;

    if (typeof(Storage) !== "undefined") {
        //If there are alread 10 portfolios we cannot create another one.
        if(!(portfolioName in localStorage) && localStorage.length >= 10){
            console.log("Can not create portfolio. Maximun number of portfolios reached.");
        }else{
            //If the stocks of the portfolios exceed 50 we dont save the overhead.
            if(portfolioStocks.length >= 50){
                console.log("Tried to store more than 50 types of stocks in a portfolio, limit is 50. Portfolio not updated.");
            }else {
                //Save the stocks provided (as a string) with in the name of the portfolio given as key.
                localStorage.setItem(portfolioName, JSON.stringify(portfolioStocks));
                success = true;
            }
        }
    } else {
        console.log("Local storage not supported in your browser.");
    }

    return success;
}

/*************************************************************************************************/
/*************************************************************************************************/
/*************************************************************************************************/

//Represents a checkbox to be selected. The value of the checkbox must be the
//symbol of the stock associated to it.
class Checkbox extends React.Component {
    //Function that pass the object symbol to the parent.
    //When controlling more than one checkbox this is neccesary to know which one
    //we are selecting.
    giveSymbolToPortfolio = () => {
        //This function is given by the parent and handles the selection of the
        //checkbox assigned to the symbol provided to the function.
        this.props.handleSelection(this.props.symbol);
    }

    render() {
        return (
                <input type="checkbox" name={"stock-"+this.props.symbol} value={this.props.symbol} onClick={this.giveSymbolToPortfolio}/>
        );
    }
}

/*************************************************************************************************/
/*************************************************************************************************/
/*************************************************************************************************/

//Represent the Stock data in the portfolio
//Contains a checkbox associated to the Stock value.
class Stock extends React.Component {
    render() {
        return (
            <tr>
                <td>{this.props.symbol}</td>
                <td>{this.props.value}</td>
                <td>{this.props.quantity}</td>
                <td>{this.props.totalValue}</td>
                <td><Checkbox symbol={this.props.symbol} handleSelection={this.props.handleSelection}/></td>
            </tr>
        );
    }
}

/*************************************************************************************************/
/*************************************************************************************************/
/*************************************************************************************************/

//Represents a generic Modal window with a close button
//and content that must be provided by the parent object.
class Modal extends React.Component {
    render() {
        //The modal window only shows if the parent component sets the 'show' value to true.
        if(!this.props.show) {
            return null;
        }

        return (
            <div className="modal-container">
                <section className="modal">
                    {this.props.children}
                    <div>
                        <button onClick={this.props.handleClose}>Close</button>
                    </div>
                </section>
            </div>
        );
    }
}

/*************************************************************************************************/
/*************************************************************************************************/
/*************************************************************************************************/

//Represents a whole portfolio
class Portfolio extends React.Component {
    constructor(props) {
        super(props);
        //In the constructor we retrieve the stocks from the localStorage and initialize other variables.
        //show: manages the rendering of the modal window, stocksSelected: manages the number of stock selected in the portfolio
        //symbolToAdd and quantityToAdd: manages the change of the input in the modal window when adding stocks.
        //portfolioValue: Stores the total value of the portfolio, usingEUR: manages the currency being used (EUR or USD).
        this.state = {stocks: this.retrieveStocks(), show: false, symbolToAdd: '', quantityToAdd: '', stocksSelected: [], portfolioValue:0, usingEUR: true};

        //Bind the functions that manage the updating of the input fields for adding a stock
        this.handleChangeSymbol = this.handleChangeSymbol.bind(this);
        this.handleChangeQuantity = this.handleChangeQuantity.bind(this);
    }

    //When the component is ready:
    componentDidMount() {
        //We fetch and assign the values of the stocks
        this.fetchStocksCurrentValues();
        //Sets the interval for re-fetching the values (every 5 min)
        this.interval = setInterval(() => {this.fetchStocksCurrentValues()}, 300000);
        console.log("Setting stock values fetching interval.")
    }

    //Clear the refreshing interval when the component is deleted
    componentWillUnmount() {
        clearInterval(this.interval);
    }

    //Function that manage the change of currency to EUR.
    changeToEUR = () => {
        console.log("Currency changed to EUR.")
        //Sets the variable 'usingEUR' to true. This re-renders the stocks with the new currency values
        this.setState({usingEUR: true})
        //Refresh the total value of the portfolio.
        this.refreshPortfolioValue(true)
    }

    //Same as the previous function but for USD
    changeToUSD = () => {
        console.log("Currency changed to USD.")
        this.setState({usingEUR: false})
        this.refreshPortfolioValue(false)
    }

    //Function for the onChange event of the input field when adding a new stock. It updates the value of the symbol to add in the portfolio.
    handleChangeSymbol(event) {
        this.setState({symbolToAdd: event.target.value});
    }

    //Function for the onChange event of the input field when adding a new stock. It updates the value of the quantity to add in the portfolio.
    handleChangeQuantity(event) {
        this.setState({quantityToAdd: event.target.value});
    }

    //Changes the 'show' variable to render the modal window
    showModal = () => {
        this.setState({show: true});
    }

    //Changes the 'show' variable to hide the modal window
    hideModal = () => {
        this.setState({show: false});
    }

    //Function that manages the stocksSelected array of the portfolio.
    //If the symbol provided is already added it is deleted. If it is not in the array it is added.
    //When a checkbox is clicked this function is executed with the proper stock symbol.
    //This way we can control the selected stocks.
    handleSelection = (symbol) => {
        let newStocksSelected = this.state.stocksSelected;

        if(!newStocksSelected.includes(symbol)){
            newStocksSelected.push(symbol);
        }else{
            const index = newStocksSelected.indexOf(symbol);
            newStocksSelected.splice(index, 1);
        }

        this.setState({stocksSelected: newStocksSelected});
    }

    //Fetch the stocks current values from the API and assign them to the stocks
    fetchStocksCurrentValues = () => {
        console.log("Fetching stock values.");

        let newStocks = this.state.stocks;
        let apiString;

        //Fetch stock values
        newStocks.forEach((stock) => {
            apiString = 'https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol='+stock.symbol+'&interval=1min&apikey=HNOEHQMOYSJQTX2T';

            fetch(apiString)
                .then(response => response.json())
                .then(data => {
                    //Assign values to the stock
                    stock.value = data["Time Series (1min)"][Object.keys(data["Time Series (1min)"])[0]]["1. open"];
                    //Sets the portfolio stocks with the new added values.
                    this.setState({stocks: newStocks})
                    //Refresh the new total portfolio value
                    this.refreshPortfolioValue(this.state.usingEUR);
                });
        })

    }

    //Function that refresh the new portfolio total value depending on the stocks on the portfolio.
    //Recieve the currency needed to visualize the total value
    refreshPortfolioValue = (usingEUR) => {
        console.log("Refreshing total portfolio value.");

        let total = 0;
        //Accumulate the total value of each stock depending on the quantity.
        this.state.stocks.forEach((stock)=>{
            if(stock.value != undefined){
                total += stock.value * stock.quantity;
            }
        })

        //Set the portfolio total value depending on the currency specified by the parameter usingEUR
        if(usingEUR){
            this.setState({portfolioValue: (Number((total).toFixed(2))+" €")})
        }else{
            this.setState({portfolioValue: (Number((total*this.props.exchange).toFixed(2))+" $")})
        }
    }

    //Adds a stock to the local storage anf to the state if possible.
    addStock = () => {
        //Create a new stock object with the symbol and quantity provided by the input fields
        let stock = {symbol: ""};
        stock.symbol = this.state.symbolToAdd;
        stock.quantity = this.state.quantityToAdd;
        stock.value = 0;

        //Copy the current stocks of the portfolio
        let newStocks = this.state.stocks;
        let symbolIsNotInPortfolio = true;

        //Check is the symbol is already in the portfolio
        for (let i = 0; i < this.state.stocks.length; i++) {
            if(this.state.stocks[i].symbol === stock.symbol){
                symbolIsNotInPortfolio = false;
            }
        }

        //If the symbol is not already in the portfolio and the symbols and quantity are valid we can continue
        if(symbolIsNotInPortfolio && stock.symbol !== "" && stock.quantity != "" && stock.quantity > 0){
            //Fetch the stock value
            fetch('https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol='+stock.symbol+'&interval=1min&apikey=HNOEHQMOYSJQTX2T')
                .then(response => response.json())
                .then(data => {
                    //Set the new stock value
                    stock.value = data["Time Series (1min)"][Object.keys(data["Time Series (1min)"])[0]]["1. open"];
                    this.refreshPortfolioValue(this.state.usingEUR);
                });

            //Add the new stock object to the stocks array
            newStocks.push(stock);
            //If the inserting operation has effect in the localStorage then we change the stocks in the component.
            if(StocksToPortfolioInStorage(this.props.name, newStocks)){
                //Set the new stocks of the portfolio
                this.setState( {stocks: newStocks} );
                //Refresh total portfolio value
                this.refreshPortfolioValue(this.state.usingEUR);
                console.log("Adding symbol: "+stock.symbol+", with quantity: "+stock.quantity);
                //If the adding operation has effect hide the modal window, otherwise the modal window stays for adding other stock and no stock is added.
                this.hideModal();
            }
        }

    }

    //Deletes the list of selected stocks in the portfolio.
    deleteSelectedStocks = () => {
        let newStocks = this.state.stocks;

        //For each stock, check if the stock is in the selected stocks list.
        //If it is in the list we delete the stock
        this.state.stocksSelected.forEach((symbolSelected) => {
            for(let i = 0; i < newStocks.length; i++) {
                if(newStocks[i].symbol == symbolSelected){
                    newStocks.splice(i, 1);
                    break;
                }
            }
        })

        //Save the new stock list in the portfolio and in the localStorage
        this.setState({stocks: newStocks});
        StocksToPortfolioInStorage(this.props.name, newStocks);

        //Clear the list of selected stocks.
        this.setState({stocksSelected: []});
        //Refresh the total value of the portfolio.
        this.refreshPortfolioValue(this.state.usingEUR);

    }

    //Executes the function that deletes the portfolio in the parent component so the portfolio disappears.
    deleteItself = () => {
        this.props.handleDeletion(this.props.name);
    }

    //Returns the content of the modal window for adding new stocks
    //In the 'addStock' button we set the onclick event ot the AddStock component function.
    createModalContent(){
        return(
            <div>
                <p>Introduce the symbol and quantity for the stock.</p><br/>

                <form action="#">
                    Symbol: <br/><input type="text" name="symbol" value={this.state.value} onChange={this.handleChangeSymbol} required/><br/><br/>
                    Quantity: <br/><input type="number" name="quantity" value={this.state.value} onChange={this.handleChangeQuantity} required/><br/><br/>
                    <input type="button" onClick={this.addStock} value="Confirm"/><br/><br/><br/>
                </form>
            </div>
        );
    }

    //Function that retrieves the stocks of the portfolio from the local storage.
    retrieveStocks(){
        let stocks = [];
        if (typeof(Storage) !== "undefined") {
            //If the portfolio has not been saved do nothing
            if(!(this.props.name in localStorage)){
                console.log("Portfolio "+this.props.name+" has no stocks.");
            }else{
                //If the portfolio is in the local storage retrieve their stocks
                stocks = JSON.parse(localStorage.getItem(this.props.name));
            }
        } else {
            console.log("Local storage not supported in your browser.");
        }

        //Returns the stocks of the portfolio or and empty array if there are no stocks
        return stocks;
    }

    //Returns the stock to render them on screen.
    createStocks(){
        if(this.state.stocks != null) {
            return(
                //For each portfolio stock create a line (Stock component) for rendering.
                this.state.stocks.map((stock) => {
                    //Depending on the current currency of the portfolio render one value or other.
                    if(this.state.usingEUR){
                        return(
                            <Stock
                                key={stock.symbol}
                                symbol={stock.symbol}
                                value={(Number((Number(stock.value) ).toFixed(3)))+" €"}
                                quantity={stock.quantity}
                                totalValue={(Number(stock.value * stock.quantity).toFixed(2))+" €"}
                                handleSelection={this.handleSelection}
                            />
                        );
                    }else{
                        return(
                            <Stock
                                key={stock.symbol}
                                symbol={stock.symbol}
                                value={(Number(stock.value * this.props.exchange).toFixed(3))+" $"}
                                quantity={stock.quantity}
                                totalValue={(Number(stock.value * stock.quantity * this.props.exchange).toFixed(2))+" $"}
                                handleSelection={this.handleSelection}
                            />
                        );
                    }
                })
            );
        }
    }

    //Render all the content of the portfolio setting the desired functions to their corresponding buttons
    render() {
        return (
            <div className="portfolio-container col-6">
                <div className="portfolio col-12">

                    <Modal show={this.state.show}
                           handleClose={this.hideModal}
                           children={this.createModalContent()}
                    />

                    <div className="portfilio-row">
                        <span className="close" onClick={this.deleteItself}>&times;</span>
                        <p className="col-4"><strong>{this.props.name}</strong></p>
                        <p className="col-4"><button onClick={this.changeToEUR}>Show in €</button></p>
                        <p className="col-3"><button onClick={this.changeToUSD}>Show in $</button></p>
                    </div>

                    <div className="portfilio-row">
                        <div className="stock-container">
                                <table className="col-12">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Unit value</th>
                                            <th>Quantity</th>
                                            <th>Total value</th>
                                            <th>Select</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {this.createStocks()}
                                    </tbody>
                                </table>
                        </div>
                    </div>

                    <div className="portfilio-row">
                        <p>Total value of the portfolio = {this.state.portfolioValue}</p>
                        <p className="col-4"><button onClick={this.showModal}>Add stock</button></p>
                        <p className="col-4"><button>Perf graph</button></p>
                        <p className="col-4"><button onClick={this.deleteSelectedStocks}>Remove selected</button></p>
                    </div>
                </div>
            </div>
        );
    }
}

/*************************************************************************************************/
/*************************************************************************************************/
/*************************************************************************************************/

//Root component of the application
class Spms extends React.Component {
    constructor(props) {
        super(props);
        //portfolios: portfolios of the app, show: variable that handles the rendering of the modal window for adding new portfolios,
        //portfolioNameToAdd: stores the name of the portfolio to be added, currencyExchange: stores the value of the currency exchange (EUR_USD)
        this.state = {portfolios: this.retrievePortfolios(), show: false, portfolioNameToAdd:'', currencyExchange: 1};

        //Bind the function that updates the input value from the modal window when adding a new portfolio.
        this.handleChangeName = this.handleChangeName.bind(this);
    }

    //When the component is ready:
    componentDidMount() {
        //Fetch and set the currency exchange
        this.fetchCurrencyExchange();
        //Set the interval for retrieving currency exchange value.
        this.interval = setInterval(() => {this.fetchCurrencyExchange()}, 300000);
        console.log("Setting currency exchange fetching interval.")
    }

    //When the component is deleted clear the interval.
    componentWillUnmount() {
        clearInterval(this.interval);
    }

    //Fetch the value of the currency exchange (EUR to USD)
    fetchCurrencyExchange = () => {
        let exchange = 1;

        //Perform the fetch
        fetch("https://free.currencyconverterapi.com/api/v6/convert?q=EUR_USD&compact=y")
            .then(response => response.json())
            .then(data => {
                //Retrieve the data from the response
                exchange = data["EUR_USD"]["val"];
                //Sets the new value of the exchange
                this.setState({currencyExchange: exchange})
                console.log("Exchange EUR_USD = "+exchange);
            });

        console.log("Fetching currency exchange.")
    }

    //Changes the 'show' variable to render the modal window
    showModal = () => {
        this.setState({show: true});
    }

    //Changes the 'show' variable to hide the modal window
    hideModal = () => {
        this.setState({show: false});
    }

    //Function for the onChange event of the input field when adding a new Portfolio. It updates the value of the portfolioName to add in the appo.
    handleChangeName(event) {
        this.setState({portfolioNameToAdd: event.target.value});
    }

    //Creates the content of the modal window for adding a portfolio.
    createModalContent(){
        return(
            <div>
                <p>Introduce the name of the portfolio.</p><br/>

                <form action="#">
                    Portfolio name: <br/><input type="text" name="portfolioName" value={this.state.value} onChange={this.handleChangeName} required/><br/><br/>
                    <input type="button" onClick={this.addPortfolio} value="Confirm"/><br/><br/><br/>
                </form>
            </div>
        );
    }

    //Retrieves the portfolios saved in the localStorage
    retrievePortfolios(){
        let portfoliosNames = [];
        if (typeof(Storage) !== "undefined") {
            if(localStorage.length == 0){
                console.log("No existing portfolios.");
            }else{
                //Retrieves the portfolioNames from the localStorage
                portfoliosNames = Object.keys(localStorage);
            }
        } else {
            console.log("Local storage not supported in your browser.");
        }

        //Return and array with the names of the portfolios if there were any.
        return portfoliosNames;
    }

    //Creates the portfolios of the app with the list of portfolios.
    //Provide also to each portfolio the exchange value and the function to delete itself.
    createPortfolios(){
        if(this.state.portfolios != null) {
            return(
                this.state.portfolios.map((portfolioName) => {
                    return(
                        <Portfolio
                            key={portfolioName}
                            name={portfolioName}
                            exchange={this.state.currencyExchange}
                            handleDeletion={this.deletePortfolio}
                        />
                    );
                })
            );
        }
    }

        //Adds a new portfolio to the app.
    addPortfolio = () => {
            //Get the name of the new portfolio
        let name = this.state.portfolioNameToAdd;

        let newPortfolios = this.state.portfolios;
        let portfolioNotAlreadyAdded = true;

        //Check is the portfolio name is already in the system
        for (let i = 0; i < this.state.portfolios.length; i++) {
            if(this.state.portfolios[i] == name){
                portfolioNotAlreadyAdded = false;
                console.log("Portfolio of same name already in the system.")
            }
        }

        //If the name is not already in the system and the name is not empty we can continue
        if(portfolioNotAlreadyAdded && name !== ""){
            //Insert the new portfolioin the auxiliary array
            newPortfolios.push(name);
            //If the inserting operation has effect in the localStorage then we change the stocks in the component.
            if(StocksToPortfolioInStorage(name, [])){
                //Sets the portfolios of the app
                this.setState( {portfolios: newPortfolios} );
                console.log("Portfolio with name: "+name+" added.");
            }
        }

    }

        //Function that deletes the portfolio with the name specified.
        //This function is intended to be executed by a portfolio passing its own name so it deletes itself.
    deletePortfolio = (portfolioName) => {
        let newPortfolios = this.state.portfolios;

        //Delete the portfolio from the array of portfolios
        let index = newPortfolios.indexOf(portfolioName);
        newPortfolios.splice(index, 1);

        //Set the new array without the deleted one in the app
        this.setState({portfolios: newPortfolios});
        //Set the new array without the deleted one in the localStorage.
        localStorage.removeItem(portfolioName);
    }

    //Render all the content of the app with the portfolios.
    render() {
        return (
            <div className="spms-container">
                <div className="add-portfolio-button col-12">
                    <p><strong>Create new portfolios by using this button.</strong></p>
                    <button onClick={this.showModal}>Add portfolio</button>
                </div>

                <Modal show={this.state.show}
                       handleClose={this.hideModal}
                       children={this.createModalContent()}
                />

                {this.createPortfolios()}
            </div>
    );
    }
}

ReactDOM.render(<Spms />, document.getElementById('root'));