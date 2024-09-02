#!/bin/bash

# * mvval.sh
# *
# * Move value from an environment variable or a file to another.
# * This script may be useful for Docker ENTRYPOINT or CMD with FLAG mounting or transferring.
# * Type `mvval.sh --help` for usage and examples.
# *
# * Copyright (c) Cnily03. All rights reserved.
# * Licensed under the MIT License.

# Options

SUPPORT_TYPE=("env" "file")
SUPPORT_RESTART=("none" "always" "on-failure")

DEFAULT_OPT_TYPE=("env" "env")
DEFAULT_OPT_NAME=("FLAG" "FLAG")
DEFAULT_OPT_RESTART="none"

opt_debug=false
opt_type=("${DEFAULT_OPT_TYPE[@]}")
opt_name=("${DEFAULT_OPT_NAME[@]}")
opt_restart="$DEFAULT_OPT_RESTART"
opt_user=""
opt_disable_clean=false
subcommand=()

# Color

function is_color_enabled() {
    # if force_color is set (no matter what value it has)
    if [ -n "$FORCE_COLOR" ]; then
        if [ "$FORCE_COLOR" = "0" ] || [ "$FORCE_COLOR" = "false" ]; then
            return 1
        else
            return 0
        fi
    elif [ -t 1 ]; then
        return 0
    else
        return 1
    fi
}

ANSI_RED="$(echo -en "\033[31m")"
ANSI_YELLOW="$(echo -en "\033[33m")"
ANSI_MAGENTA="$(echo -en "\033[35m")"
ANSI_BLUE="$(echo -en "\033[34m")"
ANSI_GREEN="$(echo -en "\033[32m")"
ANSI_CYAN="$(echo -en "\033[36m")"
ANSI_GRAY="$(echo -en "\033[90m")"
ANSI_DARK="$(echo -en "\033[2m")"
ANSI_BOLD="$(echo -en "\033[1m")"
ANSI_RESET="$(echo -en "\033[m")"
is_color_enabled
COLOR_ENABLED="$([ $? -eq 0 ] && echo 'true' || echo 'false')"

function print_warning() {
    if [ "$COLOR_ENABLED" = "true" ]; then
        echo "${ANSI_YELLOW}Warning: ${ANSI_RESET}$1"
    else
        echo "Warning: $1"
    fi
}

function print_error() {
    if [ "$COLOR_ENABLED" = "true" ]; then
        echo "${ANSI_RED}Error: ${ANSI_RESET}$1" 1>&2
    else
        echo "Error: $1" 1>&2
    fi
}

function is_debug() {
    if [ "$opt_debug" = "true" ]; then
        return 0
    else
        return 1
    fi
}

function print_debug() {
    if [ "$opt_debug" = "true" ]; then
        if [ "$COLOR_ENABLED" = "true" ]; then
            echo "${ANSI_MAGENTA}Debug: ${ANSI_RESET}$1"
        else
            echo "Debug: $1"
        fi
    fi
}

# Argument

EXE="$(basename "$0")"
if [[ "$EXE" =~ \' ]]; then
    EXE="${EXE//\\/\\\\}" # \
    EXE="${EXE//\"/\\\"}" # "
    EXE="\"$EXE\""
elif [[ "$EXE" =~ [[:space:]\\\"] ]]; then
    EXE="'""${EXE}""'"
fi

function detect_next_argument() {
    if [ -z "$2" ] || [ "${2:0:1}" = "-" ]; then
        print_error "Missing argument for $1" && exit 1
    fi
}

function detect_empty_argument() {
    if [ -z "$2" ]; then
        print_error "Empty argument for $1" && exit 1
    fi
}

ret_split=()
function split_colon_void() {
    local set_same
    set_same="${2:-false}"
    [ "$set_same" = "0" ] && set_same=false
    local array
    IFS=':' read -r -a array <<< "$1"
    local is_invalid
    if [ ${#array[@]} -eq 2 ]; then
        if [ -z "${array[0]}" ] || [ -z "${array[1]}" ]; then
            is_invalid=true
        fi
    elif [ ${#array[@]} -eq 1 ]; then
        if [ "$set_same" = "true" ] && [ -n "${array[0]}" ]; then
            array+=("${array[0]}")
        else
            is_invalid=true
        fi
    else
        is_invalid=true
    fi
    if [ "$is_invalid" = "true" ]; then
        print_error "Invalid format: $1" && exit 1
    fi
    ret_split=("${array[@]}")
}

function check_supported_type() {
    for type in "${SUPPORT_TYPE[@]}"; do
        if [ "$1" = "$type" ]; then
            return
        fi
    done
    print_error "Unsupported type: $1" && exit 1
}

function replace_non_alnum() {
    local to
    to="$(echo "$2" | sed -e 's/[]\/$*.^|[]/\\&/g')"
    echo -n "$1" | sed -e 's/[^a-zA-Z0-9]/'"$to"'/g'
}

function check_supported_restart() {
    local fmt_restart
    fmt_restart="$(replace_non_alnum "$1" "-")"
    for restart in "${SUPPORT_RESTART[@]}"; do
        if [ "$fmt_restart" = "$restart" ]; then
            return
        fi
    done
    print_error "Unsupported restart policy: $1" && exit 1
}

function check_file_source() {
    local g r
    if [ "$COLOR_ENABLED" = "true" ]; then
        g="${ANSI_GRAY}"
        r="${ANSI_RESET}"
    fi
    local rfp
    rfp="$(realpath -m "$1")"
    if [ -d "$rfp" ]; then
        print_error "Source path is a directory: ${g}$rfp${r}" && exit 1
    elif [ ! -f "$rfp" ]; then
        print_error "File not found: ${g}$rfp${r}" && exit 1
    fi
}

function check_file_target() {
    local d g r
    if [ "$COLOR_ENABLED" = "true" ]; then
        d="${ANSI_DARK}"
        g="${ANSI_GRAY}"
        r="${ANSI_RESET}"
    fi
    local rfp
    rfp="$(realpath -m "$1")"
    if [ -d "$rfp" ]; then
        print_error "Target path is a directory: $rfp" && exit 1
    fi
}

function check_user() {
    if [ -n "$1" ]; then
        if [ "$(id -u "$1" 2>/dev/null)" = "" ]; then
            print_error "User not found: $1" && exit 1
        fi
        if [ "$(id -u)" -ne 0 ]; then
            print_error "Root privilege is required to use option '--user'" && exit 1
        fi
        if ! command -v su >/dev/null; then
            print_error "Command not found: su" && exit 1
        fi
    fi
}

function print_usage() {
    local m c g d b r
    if [ "$COLOR_ENABLED" = "true" ]; then
        m="${ANSI_MAGENTA}"
        c="${ANSI_CYAN}"
        g="${ANSI_GRAY}"
        d="${ANSI_DARK}"
        b="${ANSI_BOLD}"
        r="${ANSI_RESET}"
    fi

    function add_color() {
        local IFS=,
        local array=($1)
        local result=""
        for item in "${array[@]}"; do
            result="${result}${c}${item}${r},"
        done
        echo "${result%,}"
    }

    function subarg() {
        echo "${g}$1${r}"
    }

    function quote_candidate() {
        local IFS=,
        local array=($1)
        local result=""
        for item in "${array[@]}"; do
            result="${result}${b}${item}${r},"
        done
        echo "${result%,}"
    }

    function defaults() {
        local value="$1"
        if [[ "$value" =~ [:\ \"] ]]; then
            value="${value//\\/\\\"}"
            value="${value//\"/\\\"}"
            value="\"$value\""
        fi
        echo -en "${d}(default: $value)${r}"
    }

    echo "${m}${b}Usage:${r} $EXE [...options] -- <command>"
    echo ""
    echo "${m}${b}Options:${r}"
    echo "  $(add_color "-t, --type") $(subarg "<source>:<target>")        Mount type $(defaults "${DEFAULT_OPT_TYPE[0]}:${DEFAULT_OPT_TYPE[1]}")"
    echo "             $(subarg "<type>")                   Supported types: $(quote_candidate "env, file")"
    echo "  $(add_color "-n, --name") $(subarg "<source>:<target>")        Mount name $(defaults "${DEFAULT_OPT_NAME[0]}:${DEFAULT_OPT_NAME[1]}")"
    echo "                                      An environment variable name or a file path according to the type"
    echo "  $(add_color "--restart")                           Restart policy $(defaults "$DEFAULT_OPT_RESTART")"
    echo "                                      Supported policies: $(quote_candidate "none, always, on-failure")"
    echo "  $(add_color "-u, --user") $(subarg "<user>")                   Run command as a specific user"
    echo "                                      The root privilege is required to use this option"
    echo "  $(add_color "--disable-clean")                     Disable cleaning source"
    echo "  $(add_color "--debug")                             Enable debug type"
    echo "  $(add_color "-h, --help")                          Print this help message"
    echo ""
    echo "${m}${b}Examples:${r}"
    echo "  $EXE ${d}-t${r} env:env ${d}-n${r} X_FLAG:FLAG ${d}--${r} ${g}apache2-foreground${r}"
    echo "  $EXE ${d}-t${r} env:file ${d}-n${r} FLAG:./flag.txt ${d}--restart=${r}on-failure ${d}--${r} ${g}node /app.js${r}"
    echo "  $EXE ${d}-t${r} env ${d}-n${r} X_FLAG:FLAG ${d}--restart=${r}always ${d}--${r} ${g}python3 /app.py${r}"
    echo "  $EXE ${d}-t${r} file:env ${d}-n${r} /flag.txt:FLAG -u=ctf ${d}--${r} ${g}sh -c 'echo \$FLAG'${r}"
}

function parse_options() {
    if [ $# -eq 0 ]; then
        print_usage && exit 1
    fi

    if [ "${1#-}" = "${1}" ] && [ -n "$(command -v "${1}")" ] && ! { [ -f "${1}" ] && ! [ -x "${1}" ]; }; then
        subcommand=( "$@" )
        return
    fi

    while [ $# -gt 0 ]; do
        case "$1" in
            -h|--help)
                print_usage
                exit 0
                ;;
            -t|--type)
                detect_next_argument "$1" "$2"
                split_colon_void "$2" true
                opt_type=("${ret_split[@]}")
                shift
                ;;
            -t=*|--type=*)
                detect_empty_argument "${1%%=*}" "${1#*=}"
                split_colon_void "${1#*=}" true
                opt_type=("${ret_split[@]}")
                ;;
            -n|--name)
                detect_next_argument "$1" "$2"
                split_colon_void "$2"
                opt_name=("${ret_split[@]}")
                shift
                ;;
            -n=*|--name=*)
                detect_empty_argument "${1%%=*}" "${1#*=}"
                split_colon_void "${1#*=}"
                opt_name=("${ret_split[@]}")
                ;;
            --restart)
                detect_next_argument "$1" "$2"
                opt_restart="$2"
                shift
                ;;
            --restart=*)
                detect_empty_argument "${1%%=*}" "${1#*=}"
                opt_restart="${1#*=}"
                ;;
            -u|--user)
                detect_next_argument "$1" "$2"
                opt_user="$2"
                shift
                ;;
            -u=*|--user=*)
                detect_empty_argument "${1%%=*}" "${1#*=}"
                opt_user="${1#*=}"
                ;;
            --disable-clean)
                opt_disable_clean=true
                ;;
            --debug)
                opt_debug=true
                ;;
            --)
                shift
                if [ $# -eq 0 ]; then
                    print_error "Missing command" && exit 1
                fi
                subcommand=( "$@" )
                break
                ;;
            -*)
                print_error "Unknown option: $1" && exit 1
                ;;
            *)
                print_error "Unknown argument: $1" && exit 1
                ;;
        esac
        shift
    done
}

# Check options
function check_options() {
    check_supported_type "${opt_type[0]}"
    check_supported_type "${opt_type[1]}"
    check_supported_restart "$opt_restart"
    opt_restart="$(replace_non_alnum "$opt_restart" "-")"
    check_user "$opt_user"

    if [ "${opt_type[0]}" = "file" ]; then
        check_file_source "${opt_name[0]}"
    fi

    if [ "${opt_type[1]}" = "file" ]; then
        check_file_target "${opt_name[1]}"
    fi

    if [ "${#subcommand[@]}" -eq 0 ]; then
        print_error "Command not specified" && exit 1
    fi
}

# Source: get content
function get_content() {
    local source_type="${opt_type[0]}"
    local source_name="${opt_name[0]}"
    if [ "$source_type" = "env" ]; then
        echo "${!source_name}"
    elif [ "$source_type" = "file" ]; then
        cat "$source_name"
    fi
}

# Clean the source
function clean_source() {
    local d r
    if [ "$COLOR_ENABLED" = "true" ]; then
        d="${ANSI_DARK}"
        r="${ANSI_RESET}"
    fi
    local source_type="${opt_type[0]}"
    local source_name="${opt_name[0]}"
    if [ "$source_type" = "env" ]; then
        export "$source_name"=""
        unset "$source_name"
    elif [ "$source_type" = "file" ]; then
        local stderr
        stderr="$(rm -f "$source_name" 2>&1 1>/dev/null)"
        if [ $? -ne 0 ]; then
            if [ -n "$stderr" ]; then
                is_debug && print_warning "Failed to clean source: $source_name: $stderr"
            else
                is_debug && print_warning "Failed to clean source: $source_name"
            fi
            print_debug "Making source empty: ${d}($source_type)${r} $source_name"
            stderr="$({ echo -n 3>&1 1>&2 2>&3 } 2> "$source_name")"
            if [ $? -ne 0 ]; then
                if [ -n "$stderr" ]; then
                    is_debug && print_error "Failed to make source empty: ${d}($source_type)${r}$source_name: $stderr"
                    exit 1
                else
                    is_debug && print_error "Failed to make source empty: ${d}($source_type)${r}$source_name"
                    exit 1
                fi
            fi
        fi
    fi
}

# Target: set content
function set_content() {
    local target_type="${opt_type[1]}"
    local target_name="${opt_name[1]}"
    local content="$1"
    if [ "$target_type" = "env" ]; then
        export "$target_name"="$content"
    elif [ "$target_type" = "file" ]; then
        echo -n "$content" > "$target_name"
    fi
}

# Run command
function fmt_cmdline() {
    local result=()
    local is_first
    for item in "$@"; do
        if [[ "$item" =~ \' ]]; then
            item="${item//\\/\\\\}" # \
            item="\"${item//\"/\\\"}\"" # "
            item="${item//\$/\\$}" # $
            item="${item//\`/\\\`}" # `
        elif [[ "$item" =~ [[:space:]\\\"\$\'] ]]; then
            item="'""${item}""'"
        fi
        result+=("$item")
    done
    echo "${result[@]}"
}

function run_cmd() {
    local cmd
    if [ -n "$opt_user" ]; then
        local c_cmdline="$(fmt_cmdline "$@")"
        cmd=(su "$opt_user" -c "$c_cmdline")
    else
        cmd=("$@")
    fi

    if [ "$opt_restart" = "none" ]; then
        "${cmd[@]}"
    elif [ "$opt_restart" = "always" ]; then
        while true; do
            "${cmd[@]}"
        done
    elif [ "$opt_restart" = "on-failure" ]; then
        while true; do
            "${cmd[@]}"
            if [ $? -eq 0 ]; then
                break
            fi
        done
    fi
}

# Main
function main() {
    parse_options "$@"
    check_options
    local m c bl g d b r
    if [ "$COLOR_ENABLED" = "true" ]; then
        m="${ANSI_MAGENTA}"
        c="${ANSI_CYAN}"
        bl="${ANSI_BLUE}"
        g="${ANSI_GRAY}"
        d="${ANSI_DARK}"
        b="${ANSI_BOLD}"
        r="${ANSI_RESET}"
    fi
    is_debug && echo "${bl}${b}Rule: ${r} ${d}(${opt_type[0]})${r} ${c}${opt_name[0]}${r} -> ${d}(${opt_type[1]})${r} ${c}${opt_name[1]}${r}"

    if [ "${opt_type[0]}" = "${opt_type[1]}" ] && [ "${opt_name[0]}" = "${opt_name[1]}" ]; then
        print_debug "Source and target are the same. Nothing to do."
    else
        local content
        content="$(get_content)"

        if [ -z "$content" ]; then
            if [ "${opt_type[0]}" = "env" ]; then
                is_debug && print_warning "Environment variable is empty: ${d}(${opt_type[0]})${r} ${g}${opt_name[0]}${r}"
            else
                is_debug && print_warning "File is empty: ${d}(${opt_type[0]})${r} ${g}${opt_name[0]}${r}"
            fi
        else
            if [ "${opt_type[1]}" = "env" ]; then
                print_debug "${d}(env)${r} ${c}${opt_name[0]}${r}=${b}${content}${r}"
            fi
        fi

        if [ "$opt_disable_clean" = "false" ]; then
            print_debug "Cleaning source: ${d}(${opt_type[0]})${r} ${g}${opt_name[0]}${r}"
            clean_source
        fi

        print_debug "Setting target: ${d}(${opt_type[1]})${r} ${g}${opt_name[1]}${r}"
        if [ "${opt_type[1]}" = "file" ] && [ -f "${opt_name[1]}" ]; then
            is_debug && print_warning "Target file already exists. It will be overwritten: ${d}(${opt_type[1]})${r} ${g}${opt_name[1]}${r}"
        fi
        set_content "$content"
        unset content
    fi

    cmdline="$(fmt_cmdline "${subcommand[@]}")"
    print_debug "Executing command with restart policy (${c}${opt_restart}${r})"
    is_debug && echo "${d}${bl}${b}Run:  ${r} ${d}${m}\$${r} ${d}${b}${cmdline}${r}" && echo
    run_cmd "${subcommand[@]}"
}

main "$@"
