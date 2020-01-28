import fs from 'fs';
import util from 'util';

/**
 * Check if a string is valid JSON
 * This function will check if a string can be parsed into JSON
 * or not.
 * @param {string} aString The string to be evaluated
 * @returns A boolean of true if the string can be parsed, false otherwise.
 */
export const isJSON = (aString: string): boolean => {
    try {
        JSON.parse(aString);
        return true;
    } catch (err) {
        return false;
    }
};
/**
 * Extract and return and API response message
 * The errors received from using the github API via Probot
 * will return an Error message with a JSON encoded string in the
 * message property.
 * @param {Error} error The error from which to extract the message
 * @returns Undefined if unparsable, a resolved promise containing the results otherwise
 */
export const extractMessage = async (error: Error): Promise<string> => {
    try {
        if (isJSON(error.message)) {
            const data = JSON.parse(error.message);
            return data.message;
        }

        return error.message;
    } catch (err) {
        const message = 'Unable to extract message from error';
        return message;
    }
};

/**
 * Load a template file file and return the contents.
 *
 * @param {string} path The path to the template file
 * @returns {Promise<string>} Resolved with contents, rejected otherwise
 */
export const loadTemplate = async (path: string): Promise<string> => {
    const access = util.promisify(fs.access);
    const read = util.promisify(fs.readFile);
    try {
        await access(path, fs.constants.R_OK);
        return read(path, 'utf8');
    } catch (err) {
        const message = `Unable to load template ${path}`;
        throw new Error(`${message}, error = ${err.message}`);
    }
};
