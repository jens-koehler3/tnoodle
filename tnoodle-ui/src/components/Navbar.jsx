import React, { Component } from "react";
import { Link } from "react-router-dom";
import { connect } from "react-redux";
import { logIn, logOut, fetchMe, isLogged } from "../api/wca.api";
import { updateMe } from "../redux/ActionCreators";
import { Nav, Navbar } from "react-bootstrap";

const mapStateToProps = store => ({
    me: store.me
});

const mapDispatchToProps = {
    updateMe: updateMe
};

const TnoodleNavbar = connect(
    mapStateToProps,
    mapDispatchToProps
)(
    class extends Component {
        constructor(props) {
            super(props);

            this.state = {
                homeLink: props.homeLink,
                offlineScramblerLink: props.offlineScramblerLink,
                onlineScramblerLink: props.onlineScramblerLink,
                isLogged: isLogged()
            };
        }

        handleLogIn = () => {
            if (this.state.isLogged) {
                return;
            }
            logIn();
            fetchMe().then(me => {
                this.props.updateMe(me);
            });
        };

        handleLogOut = () => {
            logOut();
            this.setState({ ...this.state, me: null });
            this.props.updateMe(null);
        };

        render() {
            return (
                <div className="container-fluid bg-dark pb-2">
                    <div className="row">
                        <div className="col-6">
                            <div className="container">
                                <div className="row pl-5">
                                    <Link
                                        className="navbar-brand"
                                        to={this.state.homeLink}
                                    >
                                        <img
                                            className="tnoodle-logo"
                                            src={require("../assets/tnoodle_logo.svg")}
                                            alt="TNoodle logo"
                                        />
                                    </Link>
                                    <Link to={this.state.homeLink}>
                                        <h1 className="display-3" id="title">
                                            TNoodle
                                        </h1>
                                    </Link>
                                </div>
                            </div>
                        </div>
                        <div className="col-6">
                            <Navbar expand="lg" className="bg-dark">
                                <Navbar.Toggle />
                                <Navbar.Collapse>
                                    <Nav>
                                        <Nav.Item>
                                            <Nav.Link
                                                eventKey="1"
                                                as={Link}
                                                to={
                                                    this.state
                                                        .offlineScramblerLink
                                                }
                                            >
                                                Offline Scrambler
                                            </Nav.Link>
                                        </Nav.Item>
                                        <Nav.Item>
                                            <Nav.Link
                                                eventKey="2"
                                                as={Link}
                                                to={
                                                    this.state
                                                        .onlineScramblerLink
                                                }
                                            >
                                                Online Scrambler
                                            </Nav.Link>
                                        </Nav.Item>
                                        <Nav.Item>
                                            <button
                                                className="btn btn-outline-primary bg-light btn-lg"
                                                onClick={
                                                    this.state.isLogged
                                                        ? this.handleLogOut
                                                        : this.handleLogIn
                                                }
                                            >
                                                {this.state.isLogged
                                                    ? "Log out"
                                                    : "Log in"}
                                            </button>
                                        </Nav.Item>
                                    </Nav>
                                </Navbar.Collapse>
                            </Navbar>
                        </div>
                    </div>
                </div>
            );
        }
    }
);

export default TnoodleNavbar;