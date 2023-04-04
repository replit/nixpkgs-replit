#! /usr/bin/env bash

set -x
set -e

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

BUNDLE_DIR=$SCRIPT_DIR/../poetry.bundle
BUNDLE_FILE=$SCRIPT_DIR/../poetry.bundle.tar.gz

rm -fr $BUNDLE_DIR

pip download git+https://github.com/replit/poetry.git -d $BUNDLE_DIR
pip download setuptools==63.2.0 -d $BUNDLE_DIR

cd $BUNDLE_DIR
tar cvfz $BUNDLE_FILE .
cd -

if [[ ! "$1" == "keepdir" ]]; then
  rm -fr $BUNDLE_DIR
fi